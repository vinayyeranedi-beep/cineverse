// Vercel Serverless Function (Node.js, ES module)
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SeatBite Cinema Production API'
  });
}
