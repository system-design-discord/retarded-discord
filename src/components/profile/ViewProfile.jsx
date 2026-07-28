import React from 'react';

const ViewProfile = () => {
  // داده‌های تستی برای نمایش ظاهر پروفایل تا زمانی که به سرور وصل شویم
  const mockUser = {
    username: "majid_dev",
    email: "majid@example.com",
    bio: "علاقه‌مند به توسعه نرم‌افزار و یادگیری تکنولوژی‌های جدید.",
    avatar: "https://via.placeholder.com/120"
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        نمایه کاربری (Profile)
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', backgroundColor: '#1e1e24', padding: '20px', borderRadius: '8px' }}>
        <img 
          src={mockUser.avatar} 
          alt="User Avatar" 
          style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '15px' }} 
        />
        
        <h3>{mockUser.username}</h3>
        <p style={{ color: '#aaa', marginBottom: '20px' }}>{mockUser.email}</p>
        
        <div style={{ width: '100%', textAlign: 'left', backgroundColor: '#2a2a35', padding: '15px', borderRadius: '6px' }}>
          <strong>درباره من:</strong>
          <p style={{ marginTop: '10px' }}>{mockUser.bio}</p>
        </div>

        <button style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
          ویرایش نمایه
        </button>
      </div>
    </div>
  );
};

export default ViewProfile;