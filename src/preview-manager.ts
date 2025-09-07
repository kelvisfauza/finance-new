export interface ContentData {
  title: string
  content: string
  author: string
  category: string
  createdAt: Date
}

export class PreviewManager {
  private titleInput: HTMLInputElement
  private contentTextarea: HTMLTextAreaElement
  private authorInput: HTMLInputElement
  private categorySelect: HTMLSelectElement
  private previewBtn: HTMLButtonElement
  private publishBtn: HTMLButtonElement
  private clearBtn: HTMLButtonElement
  private editBtn: HTMLButtonElement
  private closePreviewBtn: HTMLButtonElement
  private previewSection: HTMLElement
  private previewContent: HTMLElement
  private isPreviewMode = false

  constructor() {
    this.titleInput = document.querySelector('#title')!
    this.contentTextarea = document.querySelector('#content')!
    this.authorInput = document.querySelector('#author')!
    this.categorySelect = document.querySelector('#category')!
    this.previewBtn = document.querySelector('#preview-btn')!
    this.publishBtn = document.querySelector('#publish-btn')!
    this.clearBtn = document.querySelector('#clear-btn')!
    this.editBtn = document.querySelector('#edit-btn')!
    this.closePreviewBtn = document.querySelector('#close-preview-btn')!
    this.previewSection = document.querySelector('#preview-section')!
    this.previewContent = document.querySelector('#preview-content')!
  }

  init() {
    this.setupEventListeners()
    this.updatePreviewButton()
  }

  private setupEventListeners() {
    // Input change listeners
    const inputs = [this.titleInput, this.contentTextarea, this.authorInput, this.categorySelect]
    inputs.forEach(input => {
      input.addEventListener('input', () => this.updatePreviewButton())
    })

    // Button listeners
    this.previewBtn.addEventListener('click', () => this.showPreview())
    this.publishBtn.addEventListener('click', () => this.publishContent())
    this.clearBtn.addEventListener('click', () => this.clearForm())
    this.editBtn.addEventListener('click', () => this.exitPreview())
    this.closePreviewBtn.addEventListener('click', () => this.exitPreview())
  }

  private updatePreviewButton() {
    const hasContent = this.titleInput.value.trim() || this.contentTextarea.value.trim()
    this.previewBtn.disabled = !hasContent
  }

  private getContentData(): ContentData {
    return {
      title: this.titleInput.value.trim(),
      content: this.contentTextarea.value.trim(),
      author: this.authorInput.value.trim(),
      category: this.categorySelect.value,
      createdAt: new Date()
    }
  }

  private showPreview() {
    const data = this.getContentData()
    this.renderPreview(data)
    this.enterPreviewMode()
  }

  private renderPreview(data: ContentData) {
    const formattedDate = data.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    this.previewContent.innerHTML = `
      <article class="preview-article">
        <header class="article-header">
          <h1 class="article-title">${data.title || 'Untitled'}</h1>
          <div class="article-meta">
            ${data.author ? `<span class="author">By ${data.author}</span>` : ''}
            ${data.category ? `<span class="category">${data.category}</span>` : ''}
            <span class="date">${formattedDate}</span>
          </div>
        </header>
        <div class="article-content">
          ${this.formatContent(data.content)}
        </div>
      </article>
    `
  }

  private formatContent(content: string): string {
    if (!content) return '<p class="empty-content">No content provided</p>'
    
    // Simple formatting: convert line breaks to paragraphs
    return content
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  private enterPreviewMode() {
    this.isPreviewMode = true
    this.previewSection.style.display = 'block'
    this.publishBtn.disabled = false
    
    // Scroll to preview
    this.previewSection.scrollIntoView({ behavior: 'smooth' })
  }

  private exitPreview() {
    this.isPreviewMode = false
    this.previewSection.style.display = 'none'
    this.publishBtn.disabled = true
  }

  private publishContent() {
    const data = this.getContentData()
    
    // Simulate publishing
    this.showNotification('Content published successfully!', 'success')
    
    // Clear form after publishing
    setTimeout(() => {
      this.clearForm()
      this.exitPreview()
    }, 1500)
  }

  private clearForm() {
    this.titleInput.value = ''
    this.contentTextarea.value = ''
    this.authorInput.value = ''
    this.categorySelect.value = ''
    this.updatePreviewButton()
    this.exitPreview()
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100)
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => document.body.removeChild(notification), 300)
    }, 3000)
  }
}