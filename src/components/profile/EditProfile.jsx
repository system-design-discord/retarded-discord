import React, { useState, useEffect } from 'react';
import API from "../../services/api";

const EditProfile = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('profile/')
      .then((response) => {
        const data = response.data;
        setFormData({
          username: data.user?.username || '',
          email: data.user?.email || '',
          bio: data.bio || '',
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("خطا در دریافت پروفایل:", error);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const sendData = new FormData();
    sendData.append('bio', formData.bio);
    if (avatar) {
      sendData.append('avatar', avatar);
    }

    API.patch('profile/', sendData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then(() => {
        alert("تغییرات با موفقیت در دیتابیس ذخیره شد!");
      })
      .catch((error) => {
        console.error("خطا در ذخیره پروفایل:", error);
        alert("خطا در ذخیره تغییرات!");
      });
  };

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '2rem' }}>در حال بارگذاری اطلاعات...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        ویرایش نمایه (Edit Profile)
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', backgroundColor: '#1e1e24', padding: '20px', borderRadius: '8px' }}>
        
        {/* بخش آپلود رسانه */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="avatar" style={{ marginBottom: '5px' }}>تغییر عکس پروفایل (آپلود رسانه)</label>
          <input 
            type="file" 
            id="avatar" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ color: '#aaa', padding: '5px' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="username" style={{ marginBottom: '5px' }}>نام کاربری</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            value={formData.username} 
            disabled
            style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#1a1a20', color: '#888', cursor: 'not-allowed' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="email" style={{ marginBottom: '5px' }}>ایمیل</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email} 
            disabled
            style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#1a1a20', color: '#888', cursor: 'not-allowed' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="bio" style={{ marginBottom: '5px' }}>درباره من (Bio)</label>
          <textarea 
            id="bio" 
            name="bio" 
            value={formData.bio} 
            onChange={handleChange} 
            rows="4"
            style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#2a2a35', color: '#fff', resize: 'vertical' }}
          ></textarea>
        </div>

        <button type="submit" style={{ marginTop: '10px', padding: '12px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          ذخیره تغییرات
        </button>
      </form>
    </div>
  );
};

export default EditProfile;