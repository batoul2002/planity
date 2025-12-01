exports.uploadImages = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

  const paths = files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, data: paths });
};