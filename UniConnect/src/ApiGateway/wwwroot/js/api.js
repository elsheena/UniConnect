// ===== API CLIENT MODULE =====
// Wraps all fetch calls to the backend API

const API = {
  baseUrl: '',

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.baseUrl + path, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  },

  // Auth
  register: (data) => API.request('POST', '/api/auth/register', data),
  login: (email, password) => API.request('POST', '/api/auth/login', { email, password }),
  logout: () => API.request('POST', '/api/auth/logout'),
  me: () => API.request('GET', '/api/auth/me'),

  // Users
  getUser: (id) => API.request('GET', `/api/users/${id}`),
  updateUser: (id, data) => API.request('PUT', `/api/users/${id}`, data),
  getVerificationStatus: (id) => API.request('GET', `/api/users/${id}/verification-status`),
  updateVerificationStatus: (id, status, uniId = null) => API.request('POST', `/api/users/${id}/verification-status`, { action: status, status: status, universityId: uniId }),
  getDashboardStats: () => API.request('GET', '/api/stats'),

  async uploadDocument(userId, file, docType = 'identity') {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', docType);
    const res = await fetch(`/api/users/${userId}/upload-document`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  },

  // Universities & Applications
  applyToProgram: (uniId, programCode) => API.request('POST', `/api/universities/${uniId}/apply`, { programCode }),

  // Admin / Moderation
  moderateUser: (userId, action) => API.request('POST', `/api/admin/users/${userId}/action`, { action }),
  reportMessage: (chatId, messageId, chatType, reason) => API.request('POST', `/api/chats/messages/${messageId}/report`, { chatId, chatType, reason }),

  // Messaging (Self/Admin/Mod)
  editGroupMessage: (groupId, msgId, text) => API.request('PATCH', `/api/groups/${groupId}/messages/${msgId}`, { text }),
  deleteGroupMessage: (groupId, msgId) => API.request('DELETE', `/api/groups/${groupId}/messages/${msgId}`),
  reactGroupMessage: (groupId, msgId, amount = 10) => API.request('POST', `/api/groups/${groupId}/messages/${msgId}/react`, { amount }),

  editPrivateMessage: (chatId, msgId, text) => API.request('PATCH', `/api/chats/${chatId}/messages/${msgId}`, { text }),
  deletePrivateMessage: (chatId, msgId) => API.request('DELETE', `/api/chats/${chatId}/messages/${msgId}`),
  reactPrivateMessage: (chatId, msgId, amount = 10) => API.request('POST', `/api/chats/${chatId}/messages/${msgId}/react`, { amount }),

  // Universities & Countries
  getUniversities: () => API.request('GET', '/api/universities'),
  getUniversityById: (id) => API.request('GET', `/api/universities/${id}`),
  getCountries: () => API.request('GET', '/api/countries'),

  // Groups
  getGroups: () => API.request('GET', '/api/groups'),
  getGroup: (id) => API.request('GET', `/api/groups/${id}`),
  joinGroup: (id, data) => API.request('POST', `/api/groups/${id}/join`, data),
  leaveGroup: (id) => API.request('POST', `/api/groups/${id}/leave`),
  getMessages: (groupId) => API.request('GET', `/api/groups/${groupId}/messages`),
  sendMessage: (groupId, text) => API.request('POST', `/api/groups/${groupId}/messages`, { text }),

  // Bookings / Services
  getServiceTypes: () => API.request('GET', '/api/bookings'),
  bookService: (data) => API.request('POST', '/api/bookings/book', data),
  getMyBookings: () => API.request('GET', '/api/bookings/my-bookings'),
  getOffers: () => API.request('GET', '/api/bookings/offers'),
  acceptOffer: (id) => API.request('POST', `/api/bookings/${id}/accept`),
  completeService: (id) => API.request('POST', `/api/bookings/${id}/complete`),
  cancelBooking: (id) => API.request('POST', `/api/bookings/${id}/cancel`),
  getAcceptedServices: () => API.request('GET', '/api/bookings/accepted'),

  // Admin
  getPendingDocs: () => API.request('GET', '/api/admin/pending-documents'),
  verifyDocument: (docId, action, note, graduationDate) => API.request('POST', `/api/admin/verify/${docId}`, { action, note, graduationDate }),
  getGroupRequests: () => API.request('GET', '/api/admin/group-requests'),
  verifyGroupRequest: (reqId, action) => API.request('POST', `/api/admin/group-requests/${reqId}`, { action }),
  getAllUsers: () => API.request('GET', '/api/admin/users'),
  moderateUser: (userId, action) => API.request('POST', `/api/admin/users/${userId}/action`, { action }),
  getStats: () => API.request('GET', '/api/admin/stats'),

  // Private Chats
  getChats: () => API.request('GET', '/api/chats'),
  getChat: (id) => API.request('GET', `/api/chats/${id}`),
  sendPrivateMessage: (chatId, text) => API.request('POST', `/api/chats/${chatId}/messages`, { text }),

  // Wallet
  getWallet: () => API.request('GET', '/api/wallet'),
  walletDeposit: (amount) => API.request('POST', '/api/wallet/deposit', { amount }),
  walletBuyMP: (amount) => API.request('POST', '/api/wallet/buy-mp', { amount }),
  walletRedeem: (amount) => API.request('POST', '/api/wallet/redeem', { amount }),
  walletWithdraw: (amount) => API.request('POST', '/api/wallet/withdraw', { amount }),

  // Helpers
  getExchangeRates: (base = 'RUB') => fetch(`https://open.er-api.com/v6/latest/${base}`).then(res => res.json()),
  getAcceptedServices: () => API.request('GET', '/api/bookings/offers?accepted=true') // Adjusting to use existing offers logic or new
};
