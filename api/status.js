// file: api/status.js
module.exports = async (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is live!" });
};
