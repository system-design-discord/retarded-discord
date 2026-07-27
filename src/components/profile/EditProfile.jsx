// src/components/profile/EditProfile.jsx

import React from 'react';

const EditProfile = () => {
  return (
    <div className="edit-profile-container">
      {/* Mapped to Profile Wireframe - Edit Profile Screen */}
      <h1>Edit Profile</h1>
      <p>Update your public profile information, avatar, banner, and profile bio.</p>
      
      <div className="profile-preview">
        <h3>Profile Preview</h3>
        <p>Preview how your profile header will appear to other users.</p>
        <div className="banner-preview">Banner Preview</div>
        <div className="preview-header">
          <div className="avatar-placeholder">AV</div>
          <div className="user-titles">
            <h2>Alex Morgan</h2>
            <span>@alex_morgan</span>
          </div>
          <div className="media-actions">
            <button>Change Avatar</button>
            <button>Change Banner</button>
          </div>
        </div>
      </div>
      
      <form className="edit-profile-form">
        <div className="public-identity">
          <h3>Public Identity</h3>
          <p>These fields are shown on your public profile and in conversations.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Display Name</label>
              <input type="text" defaultValue="Alex Morgan" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" defaultValue="alex_morgan" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Profile Status</label>
              <input type="text" defaultValue="Online" />
            </div>
            <div className="form-group">
              <label>Short Tag</label>
              <input type="text" defaultValue="Backend Student" />
            </div>
          </div>
        </div>
        
        <div className="about-me">
          <h3>About Me</h3>
          <p>Write a short bio that other users can see on your profile.</p>
          <textarea defaultValue="Computer engineering student. Interested in backend development, system design, and group projects."></textarea>
          <span className="char-count">120/200 characters</span>
        </div>
        
        <div className="visibility-reminder">
          <h3>Visibility Reminder</h3>
          <p>Only public profile fields are edited here. Email and sensitive account information are controlled from Settings.</p>
          <button type="button">Privacy Safe</button>
        </div>
        
        <div className="form-footer">
          <div className="feedback-state">
            Profile changes are saved after validation.
          </div>
          <div className="action-buttons">
            <button type="button">Cancel</button>
            <button type="submit">Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;