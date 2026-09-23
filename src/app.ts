import express from 'express';
import emailRouter from './routes/email';
import viewsRouter from './routes/views';

const app = express();
app.use(express.json());

app.use('/api/v1/mailer', emailRouter); // <--- Це означає, що нові шляхи будуть /api/v1/mailer/register та /api/v1/mailer/verify
app.use('/mailer', viewsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lightweight Resend microservice running on port ${PORT}`);
});
