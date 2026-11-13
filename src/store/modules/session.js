const state = () => ({
  sessionId: "",
  isSpectator: false,
  playerCount: 0,
  playerId: "",
  playerName: "",
  claimedSeat: -1,
  nomination: false,
  playerVotes: 1,
  votes: [],
  lockedVote: 0,
  isVoteInProgress: false,
  isSecretVote: false,
  voteHistory: [],
  voteSelected: [],
  isRolesDistributed: false,
  isReview: false,
  isTyping: false,
  drawRoles: [],
  isUseOldOrder: {
    pithag: false,
    professor: false
  },
  isUseOldRole: {
    balloonist: false,
    acrobat: false,
    lilmonsta: false,
    alchemist: false,
    lycanthrope: false
  }
});

const mutations = {
  setDrawRoles(state, roles) {
    if (!roles) return;
    state.drawRoles = [...roles];
  },
  setIsReview(state, value) {
    state.isReview = value;
  },
  setPlayerVotes(state, votes) {
    state.playerVotes = votes;
  }
};

export default {
  namespaced: true,
  state,
  mutations
};
