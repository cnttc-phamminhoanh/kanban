const jwt = require("jsonwebtoken");

const repository = require("../repositories/auth.repository");

async function login(username, password) {
  const user = await repository.findUserByUserNoAndPassword(username, password);

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const payload = {
    id: user.user_no,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });

  return {
    token,
    user: {
      id: user.user_no,
    },
  };
}

async function getUserByUserNo(user_no) {
  return repository.findUserByUserNo(user_no);
}

async function getFlowsByUser(user_no) {
  return repository.findFlowsByUserNo(user_no);
}

async function canAccessFlow(user_no, flow) {
  if (!user_no || !flow) {
    return false;
  }

  const flows = await repository.findFlowsByUserNo(user_no);

  return flows.some(item => item.flow === flow);
}

module.exports = {
  login,
  getUserByUserNo,
  getFlowsByUser,
  canAccessFlow,
};
