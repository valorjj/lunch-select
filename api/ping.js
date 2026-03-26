export default function handler(req, res) {
  res.status(200).json({ ping: 'pong', time: Date.now(), node: process.version });
}
