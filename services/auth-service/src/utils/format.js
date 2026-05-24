function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  };
}

module.exports = { formatUser };