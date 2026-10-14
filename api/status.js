// Vercel Serverless Function (Node.js, ES module)
export default function handler(req, res) {
  res.status(200).json({
    app: 'SeatBite',
    version: '2.0.0',
    mode: 'production',
    uptime: process.uptime()
  });
}
