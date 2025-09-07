import './style.css'
import { PreviewManager } from './preview-manager'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="container">
    <header class="header">
      <h1>Content Preview System</h1>
      <p>Create and preview your content before publishing</p>
    </header>
    
    <div class="editor-section">
      <h2>Content Editor</h2>
      <div class="form-group">
        <label for="title">Title</label>
        <input type="text" id="title" placeholder="Enter your title..." />
      </div>
      
      <div class="form-group">
        <label for="content">Content</label>
        <textarea id="content" rows="8" placeholder="Write your content here..."></textarea>
      </div>
      
      <div class="form-group">
        <label for="author">Author</label>
        <input type="text" id="author" placeholder="Author name..." />
      </div>
      
      <div class="form-group">
        <label for="category">Category</label>
        <select id="category">
          <option value="">Select category...</option>
          <option value="technology">Technology</option>
          <option value="design">Design</option>
          <option value="business">Business</option>
          <option value="lifestyle">Lifestyle</option>
        </select>
      </div>
      
      <div class="button-group">
        <button id="preview-btn" class="btn btn-primary">Preview</button>
        <button id="publish-btn" class="btn btn-success" disabled>Publish</button>
        <button id="clear-btn" class="btn btn-secondary">Clear</button>
      </div>
    </div>
    
    <div class="preview-section" id="preview-section" style="display: none;">
      <h2>Preview</h2>
      <div class="preview-controls">
        <button id="edit-btn" class="btn btn-outline">Edit</button>
        <button id="close-preview-btn" class="btn btn-outline">Close Preview</button>
      </div>
      <div class="preview-content" id="preview-content"></div>
    </div>
  </div>
`

const previewManager = new PreviewManager()
previewManager.init()