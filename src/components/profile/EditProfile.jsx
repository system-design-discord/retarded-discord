import React, { useState } from 'react';

const EditProfile = () => {
  // مدیریت وضعیت (State) برای فرم ویرایش
  const [formData, setFormData] = useState({
    username: "majid_dev",
    email: "majid@example.com",
    bio: "علاقه‌مند به توسعه نرم‌افزار و یادگیری تکنولوژی‌های جدید.",
  });

  // تابع برای مدیریت تغییرات در ورودی‌های متنی
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // تابع برای مدیریت کلیک روی دکمه ذخیره
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("داده‌های ارسال شده به سرور:", formData);
    alert("تغییرات شما ذخیره شد! (این پیام تستی است)");
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        ویرایش نمایه (Edit Profile)
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', backgroundColor: '#1e1e24', padding: '20px', borderRadius: '8px' }}>
        
        {/* بخش آپلود رسانه که جزو وظایف اصلی شماست */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="avatar" style={{ marginBottom: '5px' }}>تغییر عکس پروفایل (آپلود رسانه)</label>
          <input type="file" id="avatar" accept="image/*" style={{ color: '#aaa', padding: '5px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="username" style={{ marginBottom: '5px' }}>نام کاربری</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            value={formData.username} 
            onChange={handleChange} 
            style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#2a2a35', color: '#fff' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="email" style={{ marginBottom: '5px' }}>ایمیل</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#2a2a35', color: '#fff' }}
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