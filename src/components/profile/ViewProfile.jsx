// src/components/profile/ViewProfile.jsx

import React from 'react';

const ViewProfile = () => {
  return (
    <div className="view-profile-container">
      {/* Mapped to Profile Wireframe - View Profile Screen */}
      <div className="profile-banner">Profile Banner / Cover Area</div>
      
      <div className="profile-header">
        <div className="avatar-placeholder">AV</div>
        <div className="user-titles">
          <h2>Alex Morgan</h2>
          <span>@alex_morgan</span>
          <span className="status-badge">Online</span>
        </div>
        <div className="profile-actions">
          <button>Message</button>
          <button>Add Friend</button>
        </div>
      </div>
      
      <div className="profile-about">
        <h3>About Me</h3>
        <p>Computer engineering student. Interested in backend development, system design, and group projects.</p>
      </div>
      
      <div className="profile-details-grid">
        <div className="profile-details">
          <h3>Profile Details</h3>
          <ul>
            <li><strong>Display Name:</strong> Alex Morgan</li>
            <li><strong>Username:</strong> alex_morgan</li>
            <li><strong>Status:</strong> Online</li>
          </ul>
        </div>
        
        <div className="mutual-context">
          <h3>Mutual Context</h3>
          <p>Shared spaces where both users can interact:</p>
          <div className="badges">
            <span>Project Group</span>
            <span>#backend</span>
            <span>Course Channel</span>
          </div>
        </div>
      </div>
      
      <div className="contact-visibility">
        <h3>Contact and Visibility</h3>
        <p>Only public profile information is visible. Private fields such as email are hidden based on privacy settings.</p>
        <p><strong>Available Action:</strong> Send a direct message to this user</p>
      </div>
      
      <div className="view-state">
        <p>Public profile loaded successfully.</p>
        <button>Close Profile</button>
      </div>
    </div>
  );
};

export default ViewProfile;