const Election = require("../Models/Election");

module.exports = async function getActiveElection() {
  const election = await Election.findOne({
    isActive: true,
    status: "ONGOING",
  });

  // if (!election) {
  //   throw new Error("No active election found");
  // }

  return election;
};
