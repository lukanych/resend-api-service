# ========================================================================= 
# 1. INITIALIZATION & CONFIGURATION 
# ========================================================================= 
# Exclude heavy runtime, build, and source control folders to prevent tree clutter
$exclude = @('node_modules', '.next', '.git', 'dist', 'build', '.vscode', 'out', 'data') 
$outputFile = "project-tree-model-process.txt" 
$prismaFile = "prisma/schema.prisma" 
$dockerComposeFile = "docker-compose.yml" 

# Initialize a clean empty file using explicit UTF-8 encoding
New-Item -Path $outputFile -ItemType File -Force | Out-Null 
Add-Content -Path $outputFile -Value (Split-Path (Get-Location) -Leaf) -Encoding utf8
# ========================================================================= 
# 2. DOCKER COMPOSE PARSER (Extracts networks and depends_on blocks) 
# ========================================================================= 
$dockerMap = @{} 
if (Test-Path $dockerComposeFile) { 
    $composeContent = Get-Content $dockerComposeFile 
    $currentService = $null 
    $inNetworks = $false 
    $inDepends = $false 
 
    foreach ($line in $composeContent) { 
        $trimmed = $line.Trim() 
        if ($line -match '^\s{2}(\w[\w-]*):') { 
            $currentService = $Matches[1] 
            $dockerMap[$currentService] = @{ "networks" = @(); "depends" = @() } 
            $inNetworks = $false 
            $inDepends = $false 
            continue 
        } 
        if ($currentService) { 
            if ($trimmed -eq "networks:") { $inNetworks = $true; $inDepends = $false; continue } 
            if ($trimmed -eq "depends_on:") { $inDepends = $true; $inNetworks = $false; continue } 
            if ($line -match '^\s{4}\w+:') { $inNetworks = $false; $inDepends = $false } 
            if ($trimmed -match '^-\s+(\w[\w-]*)') { 
                $value = $Matches[1] 
                if ($inNetworks) { $dockerMap[$currentService]["networks"] += $value } 
                if ($inDepends) { $dockerMap[$currentService]["depends"] += $value } 
            } 
        } 
    } 
} 

# ========================================================================= 
# 3. PRISMA SCHEMA PARSER (Extracts ORM model columns and data relations) 
# ========================================================================= 
$dbModels = @{} 
if (Test-Path $prismaFile) { 
    $currentModel = $null 
    $fields = @() 
    Get-Content $prismaFile | ForEach-Object { 
        $line = $_.Trim() 
        if ($line -match '^model\s+(\w+)\s*\{') { 
            $currentModel = $Matches[1] 
            $fields = @() 
        } 
        elseif ($line -eq "}" -and $currentModel -ne $null) { 
            $dbModels[$currentModel] = $fields 
            $currentModel = $null 
        } 
        elseif ($currentModel -ne $null -and $line -match '^(\w+)\s+(\w+\[?\]?(\?|!)?)') { 
            $colName = $Matches[1] 
            $colType = $Matches[2] 
            $tag = " * " 
            if ($line -match '@id') { $tag = " (ID) " } 
            elseif ($line -match '@relation' -or $colType -match '\[\]') { $tag = " (REL) " } 
            elseif ($colName -match 'createdAt|updatedAt') { $tag = " (SYS) " } 
            $fields += "$tag$colName : $colType" 
        } 
    } 
}
# ========================================================================= 
# 4. DEPENDENCY EXTRACTOR FUNCTIONS 
# ========================================================================= 
function Get-DependentModels ($filePath) { 
    if (-not (Test-Path $filePath)) { return @() } 
    $content = Get-Content $filePath -Raw 
    $foundModels = @() 
    foreach ($model in $dbModels.Keys) { 
        if ($content -match "\b$model\b") { $foundModels += $model } 
    } 
    return $foundModels 
} 

function Get-FetchDependencies ($filePath) { 
    if (-not (Test-Path $filePath)) { return @() } 
    $content = Get-Content $filePath -Raw 
    $foundFetches = @() 
    $regex = 'fetch\(\s*[''"`\/]([^''"`\\?]+)' 
    $matches = [regex]::Matches($content, $regex) 
    foreach ($m in $matches) { 
        $urlPath = $m.Groups[1].Value.Trim() 
        if ($urlPath -notmatch '^api') { $urlPath = "api/" + $urlPath.Trim('/') } 
        if ($foundFetches -notcontains $urlPath) { $foundFetches += $urlPath } 
    } 
    return $foundFetches 
} 

function Get-ServiceEnvDependencies ($filePath) { 
    if (-not (Test-Path $filePath)) { return @() } 
    $content = Get-Content $filePath -Raw 
    $foundEnvs = @() 
    $regex = 'process\.env\.(\w+)|process\.env\s*\[\s*[''"` ](\w+)[''"` ]\s*\]' 
    $matches = [regex]::Matches($content, $regex) 
    foreach ($m in $matches) { 
        $envKey = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { $m.Groups[2].Value } 
        if ($envKey -and $envKey -notmatch '^(NODE_ENV|PORT)$' -and $foundEnvs -notcontains $envKey) { $foundEnvs += $envKey } 
    } 
    return $foundEnvs 
}
# ========================================================================= 
# 5. RECURSIVE TREE GENERATOR & EXECUTION ROOT
# ========================================================================= 
function Show-Tree ($path, $indent = "") { 
    $items = Get-ChildItem $path | Where-Object { $exclude -notcontains $_.Name } 
 
    for ($i = 0; $i -lt $items.Count; $i++) { 
        $item = $items[$i] 
        $isLast = $i -eq ($items.Count - 1) 
 
        if ($isLast) { $junction = "\-- " } else { $junction = "+-- " } 
        if ($isLast) { $padding = "   " } else { $padding = "|  " } 
        $nextIndent = $indent + $padding 
        $metaAnnotations = @() 
 
        # Track used Prisma database models for current file dependency mapping
        $detectedModelsInFile = @()
 
        # --- A: Scan Project Source Files --- 
        if (-not $item.PSIsContainer) { 
            if (($item.Extension -match '^\.(tsx|jsx|js|ts)$') -and ($item.Name -notmatch '^(package|tsconfig|prisma\.config)\.')) { 
                $fetches = Get-FetchDependencies $item.FullName 
                foreach ($apiRoute in $fetches) { $metaAnnotations += " --> [Fetch: /$apiRoute]" } 
                
                # Check for direct database model structural dependencies
                $detectedModelsInFile = Get-DependentModels $item.FullName 
                foreach ($model in $detectedModelsInFile) { 
                    $metaAnnotations += " --> [Uses DB Model: $model]" 
                } 
            } 
            if ($item.Name -eq "main.ts" -and $item.FullName -match 'services') { 
                $serviceEnvs = Get-ServiceEnvDependencies $item.FullName 
                foreach ($env in $serviceEnvs) { $metaAnnotations += " --> [Requires Env: $env]" } 
 
                $detectedModelsInFile = Get-DependentModels $item.FullName 
                foreach ($model in $detectedModelsInFile) { $metaAnnotations += " --> [DB Service Link: $model]" } 
            } 
            if ($item.Name -eq "Dockerfile") { 
                $parentName = Split-Path (Split-Path $item.FullName -Parent) -Leaf 
                $matchedService = $dockerMap.Keys | Where-Object { $_ -eq $parentName -or $_ -eq "$parentName-service" -or $_ -eq "$parentName-ui" -or $_ -eq "$parentName-worker" } | Select-Object -First 1 
 
                if ($matchedService) { 
                    $nets = $dockerMap[$matchedService]["networks"] -join ", " 
                    $deps = $dockerMap[$matchedService]["depends"] -join ", " 
                    $metaAnnotations += " --> [Docker Container: $matchedService]" 
                    if ($nets) { $metaAnnotations += " --> [Networks: $nets]" } 
                    if ($deps) { $metaAnnotations += " --> [Depends On: $deps]" } 
                } 
            } 
        } 
        # --- B: Root Infrastructure File Mapping --- 
        if ($item.Name -eq "docker-compose.yml") { 
            $metaAnnotations += " --> [Infrastructure Orchestrator]" 
            foreach ($srv in $dockerMap.Keys) { 
                $deps = $dockerMap[$srv]["depends"] -join ", " 
                if ($deps) { $metaAnnotations += " --> [Route: $srv -> depends on: $deps]" } 
                else { $metaAnnotations += " --> [Route: $srv -> standalone]" } 
            } 
        } 
 
        # === ASSIGN ASCII-SAFE LABELS BY FILE TYPE ===
        $label = "[FILE] " 
        if ($item.PSIsContainer) { 
            $label = "[DIR]  " 
        } elseif ($item.Name -eq "Dockerfile" -or $item.Name -eq "docker-compose.yml") { 
            $label = "[DOCKER] " 
        } elseif ($item.Name -eq "package.json" -or $item.Name -eq "package-lock.json") { 
            $label = "[PKG]  " 
        } elseif ($item.Extension -eq ".prisma") { 
            $label = "[PRISMA] " 
        } elseif ($item.Extension -match '^\.(tsx|ts|jsx|js)$') { 
            $label = "[SRC]  " 
        } elseif ($item.Extension -match '^\.(json|md|yml|yaml|txt)$') { 
            $label = "[CONF] " 
        }
 
        # Generate text string for the current branch tree item
        $displayNodeName = $label + $item.Name
        if ($metaAnnotations.Count -gt 0) { 
            Add-Content -Path $outputFile -Value ($indent + $junction + $displayNodeName + $metaAnnotations) -Encoding utf8 
            $visualSpacing = " " * ($displayNodeName.Length + 1) 
            for ($mIdx = 1; $mIdx -lt $metaAnnotations.Count; $mIdx++) { 
                Add-Content -Path $outputFile -Value ($indent + $padding + $visualSpacing + $metaAnnotations[$mIdx].TrimStart()) -Encoding utf8 
            } 
        } else { 
            Add-Content -Path $outputFile -Value ($indent + $junction + $displayNodeName) -Encoding utf8 
        } 
 
        # === DATABASE TABLE SCHEMATICS COMPONENT ===
        if (-not $item.PSIsContainer -and $detectedModelsInFile.Count -gt 0) {
            foreach ($model in $detectedModelsInFile) {
                Add-Content -Path $outputFile -Value ("$nextIndent   +-- [DATABASE SCHEMA INTERFACE -> $model]") -Encoding utf8
                Add-Content -Path $outputFile -Value ("$nextIndent   |   +---------------------------+---------------------------+------------+") -Encoding utf8
                Add-Content -Path $outputFile -Value ("$nextIndent   |   | FIELD NAME                | DATA TYPE                 | ATTRIBUTE  |") -Encoding utf8
                Add-Content -Path $outputFile -Value ("$nextIndent   |   +---------------------------+---------------------------+------------+") -Encoding utf8
                
                foreach ($column in $dbModels[$model]) { 
                    if ($column -match '^\s*\(([^)]+)\)\s*(\w+)\s*:\s*(.+)$') {
                        $tag = $Matches[1].Trim()
                        $name = $Matches[2].Trim()
                        $type = $Matches[3].Trim()
                    } elseif ($column -match '^\s*\*\s*(\w+)\s*:\s*(.+)$') {
                        $tag = "FIELD"
                        $name = $Matches[1].Trim()
                        $type = $Matches[2].Trim()
                    } else {
                        continue
                    }
                    
                    $padName = $name.PadRight(25).Substring(0, 25)
                    $padType = $type.PadRight(26).Substring(0, 26)
                    $padTag  = $tag.PadRight(10).Substring(0, 10)
                    
                    Add-Content -Path $outputFile -Value ("$nextIndent   |   | $padName | $padType | $padTag |") -Encoding utf8
                }
                Add-Content -Path $outputFile -Value ("$nextIndent   |   +---------------------------+---------------------------+------------+") -Encoding utf8
            }
        }
 
        # === NEW FORMAT: DOCKER CONTAINER FILE WITH MATCHING DB BOX-BORDER ===
        if (-not $item.PSIsContainer -and ($item.Name -eq "Dockerfile" -or $item.Name -eq "docker-compose.yml")) { 
            if (Test-Path $item.FullName) { 
                $fileLines = Get-Content $item.FullName -Encoding utf8 
                
                Add-Content -Path $outputFile -Value ("$nextIndent   +-- [DOCKER FILE CONTENT -> $($item.Name)]") -Encoding utf8
                Add-Content -Path $outputFile -Value ("$nextIndent   |   +----------------------------------------------------------------------------+") -Encoding utf8
                
                foreach ($fLine in $fileLines) { 
                    # Pad the code row to maintain exact right border line alignment (74 characters wide content box)
                    $cleanRow = $fLine
                    if ($cleanRow.Length -gt 74) {
                        $cleanRow = $cleanRow.Substring(0, 71) + "..."
                    }
                    $padRow = $cleanRow.PadRight(74)
                    Add-Content -Path $outputFile -Value ("$nextIndent   |   | $padRow |") -Encoding utf8 
                } 
                Add-Content -Path $outputFile -Value ("$nextIndent   |   +----------------------------------------------------------------------------+") -Encoding utf8
            } 
        } 
 
        # Scenario B: Dynamic API Endpoint Route Context Mapping 
        if (-not $item.PSIsContainer -and ($item.Name -match '^route\.(ts|js)$')) { 
            $models = Get-DependentModels $item.FullName 
            foreach ($model in $models) { 
                Add-Content -Path $outputFile -Value ($nextIndent + "[DB Table Match] -> $model") -Encoding utf8 
                foreach ($column in $dbModels[$model]) { Add-Content -Path $outputFile -Value ($nextIndent + "    $column") -Encoding utf8 } 
            } 
        } 
 
        if ($item.PSIsContainer) { Show-Tree $item.FullName $nextIndent } 
    } 
} 
 
# Launch architecture engine process from runtime path location 
Show-Tree (Get-Location) 
Write-Host "Success! Clean model and beautifully bordered docker layouts saved to: $outputFile" -ForegroundColor Green
