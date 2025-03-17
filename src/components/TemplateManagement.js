// src/components/TemplateManagement.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TemplateManagement.css';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/get-templates');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      const response = await fetch(`/.netlify/functions/delete-template/${templateId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      // Remove the deleted template from the list
      setTemplates(templates.filter(template => template.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(`Error deleting template: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading templates...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="template-management">
      <div className="management-header">
        <h2>Certificate Templates</h2>
        <Link to="/templates/new" className="create-button">Create New Template</Link>
      </div>
      
      {templates.length === 0 ? (
        <div className="no-templates">
          <p>You don't have any templates yet.</p>
          <Link to="/templates/new" className="create-button">Create Your First Template</Link>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-preview">
                {/* This would be a thumbnail of the template */}
                <div className="template-thumbnail" style={{ backgroundColor: template.background }}>
                  <span>{template.name}</span>
                </div>
              </div>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="template-actions">
                <Link to={`/templates/edit/${template.id}`} className="edit-button">Edit</Link>
                <Link to={`/generate-certificate?template=${template.id}`} className="use-button">Use</Link>
                <button onClick={() => deleteTemplate(template.id)} className="delete-button">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;