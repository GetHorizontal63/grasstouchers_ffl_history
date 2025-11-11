/**
 * News Article Page JavaScript
 * Handles loading and displaying individual news articles
 */

let allNewsItems = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeArticlePage();
});

/**
 * Initialize the article page
 */
async function initializeArticlePage() {
    try {
        // Get article ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');

        if (!articleId) {
            showError('No article specified');
            return;
        }

        // Load news data
        const response = await fetch('../data/news.json');
        if (!response.ok) throw new Error('Failed to load news data');
        
        const data = await response.json();
        allNewsItems = data.news || data;

        // Find the article
        const article = allNewsItems.find(item => item.id === articleId);

        if (!article) {
            showError('Article not found');
            return;
        }

        // Display the article
        displayArticle(article);

        // Display related articles
        displayRelatedArticles(article);

        // Display recent news in sidebar
        displayRecentNews(article);

    } catch (error) {
        console.error('Error loading article:', error);
        showError('Failed to load article');
    }
}

/**
 * Display the main article content
 */
function displayArticle(article) {
    // Set category
    const categoryElement = document.getElementById('article-category');
    if (categoryElement) {
        categoryElement.textContent = article.category || 'News';
    }

    // Set date
    const dateElement = document.getElementById('article-date');
    if (dateElement) {
        dateElement.textContent = formatDate(article.date);
    }

    // Set title
    const titleElement = document.getElementById('article-title');
    if (titleElement) {
        titleElement.textContent = article.title;
    }

    // Set image if available
    if (article.image && article.image !== '') {
        const imageContainer = document.getElementById('article-image-container');
        const imageElement = document.getElementById('article-image');
        if (imageContainer && imageElement) {
            imageElement.src = '../' + article.image;
            imageElement.alt = article.title;
            imageContainer.style.display = 'block';
        }
    }

    // Set summary
    const summaryElement = document.getElementById('article-summary');
    if (summaryElement && article.summary) {
        summaryElement.textContent = article.summary;
    }

    // Set content
    const contentElement = document.getElementById('article-content');
    if (contentElement) {
        // Format the content (preserve line breaks and format lists if needed)
        const formattedContent = formatArticleContent(article.content);
        contentElement.innerHTML = formattedContent;
    }

    // Update page title
    document.title = `${article.title} - Fantasy Football League`;
}

/**
 * Format article content with proper HTML structure
 */
function formatArticleContent(content) {
    if (!content) return '<p>No content available.</p>';

    // Split content by line breaks
    const lines = content.split('\n');
    let formattedHTML = '';
    let inList = false;

    lines.forEach(line => {
        line = line.trim();
        
        if (line === '') {
            if (inList) {
                formattedHTML += '</ul>';
                inList = false;
            }
            return;
        }

        // Check if line looks like a list item (starts with - or •)
        if (line.startsWith('-') || line.startsWith('•')) {
            if (!inList) {
                formattedHTML += '<ul>';
                inList = true;
            }
            formattedHTML += `<li>${line.substring(1).trim()}</li>`;
        } else {
            if (inList) {
                formattedHTML += '</ul>';
                inList = false;
            }
            formattedHTML += `<p>${line}</p>`;
        }
    });

    if (inList) {
        formattedHTML += '</ul>';
    }

    return formattedHTML || '<p>No content available.</p>';
}

/**
 * Display related articles
 */
function displayRelatedArticles(currentArticle) {
    const relatedContainer = document.getElementById('related-articles-list');
    if (!relatedContainer) return;

    // Get articles from the same category or just recent ones
    let relatedArticles = allNewsItems.filter(item => 
        item.id !== currentArticle.id && 
        (item.category === currentArticle.category || Math.random() > 0.5)
    ).slice(0, 3);

    // If not enough related articles, just get the next 3
    if (relatedArticles.length < 3) {
        relatedArticles = allNewsItems
            .filter(item => item.id !== currentArticle.id)
            .slice(0, 3);
    }

    if (relatedArticles.length === 0) {
        relatedContainer.innerHTML = '<p style="color: var(--text-dim); padding: 20px; text-align: center;">No related articles available</p>';
        return;
    }

    relatedContainer.innerHTML = relatedArticles.map(article => `
        <a href="news-article.html?id=${article.id}" class="related-article-item">
            <div class="related-article-category">${article.category || 'News'}</div>
            <div class="related-article-title">${article.title}</div>
            <div class="related-article-date">${formatDate(article.date)}</div>
        </a>
    `).join('');
}

/**
 * Display recent news in sidebar
 */
function displayRecentNews(currentArticle) {
    const sidebarContainer = document.getElementById('recent-sidebar-list');
    if (!sidebarContainer) return;

    // Get 5 most recent articles, excluding current one
    const recentArticles = allNewsItems
        .filter(item => item.id !== currentArticle.id)
        .slice(0, 5);

    if (recentArticles.length === 0) {
        sidebarContainer.innerHTML = '<p style="color: var(--text-dim); padding: 20px; text-align: center;">No recent news</p>';
        return;
    }

    sidebarContainer.innerHTML = recentArticles.map(article => `
        <a href="news-article.html?id=${article.id}" class="sidebar-news-item">
            <div class="sidebar-news-category">${article.category || 'News'}</div>
            <div class="sidebar-news-title">${article.title}</div>
            <div class="sidebar-news-date">${formatDate(article.date)}</div>
        </a>
    `).join('');
}

/**
 * Show error message
 */
function showError(message) {
    const articleElement = document.querySelector('.news-article');
    if (articleElement) {
        articleElement.innerHTML = `
            <div class="article-error">
                <h2>Error Loading Article</h2>
                <p>${message}</p>
                <p style="margin-top: 20px;">
                    <a href="../index.html" class="back-button">Return to Home</a>
                </p>
            </div>
        `;
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '--';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
}
