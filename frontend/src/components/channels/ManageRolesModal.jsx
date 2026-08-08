import React, { useState } from 'react';

const MOCK_MEMBERS = [
  { id: 1, name: 'آرمان (Backend Lead)', role: 'Admin', canPostMedia: true, canCreateTopic: true },
  { id: 2, name: 'امیر (شما)', role: 'Admin', canPostMedia: true, canCreateTopic: true },
  { id: 3, name: 'آروین (PO)', role: 'Moderator', canPostMedia: true, canCreateTopic: false },
  { id: 4, name: 'مجید (Media/DB)', role: 'Member', canPostMedia: false, canCreateTopic: false },
];

const ManageRolesModal = ({ channelName, onClose }) => {
  const [members, setMembers] = useState(MOCK_MEMBERS);

  const handleRoleChange = (memberId, newRole) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const handlePermissionToggle = (memberId, perm) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, [perm]: !m[perm] } : m));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', width: '460px', color: '#fff', border: '1px solid #334155' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>مدیریت نقش‌ها و دسترسی‌ها</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>کانال #{channelName} (سطوح دسترسی ۸ گانه)</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
          {members.map(member => (
            <div key={member.id} style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '14px' }}>{member.name}</strong>
                <select 
                  value={member.role} 
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  <option value="Admin">Admin (مدیر)</option>
                  <option value="Moderator">Moderator (ناظر)</option>
                  <option value="Member">Member (عضو)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#cbd5e1' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={member.canPostMedia} 
                    onChange={() => handlePermissionToggle(member.id, 'canPostMedia')} 
                  />
                  ارسال رسانه/فایل
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={member.canCreateTopic} 
                    onChange={() => handlePermissionToggle(member.id, 'canCreateTopic')} 
                  />
                  ساخت تاپیک
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            ذخیره و بستن
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRolesModal;