const service = require("../services/auth.service");

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const result = await service.login(username, password);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Username or password is incorrect",
      });
    }

    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await service.getUserByUserNo(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const flows = await service.getFlowsByUser(user.user_no);

    res.json({
      success: true,
      user: {
        id: user.user_no,
      },
      flows,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = {
  login,
  me,
  logout,
};
