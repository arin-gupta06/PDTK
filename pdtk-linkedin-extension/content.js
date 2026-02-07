/**
 * content.js - PDTK LinkedIn Sync (Deep-Traversal Version)
 * Uses proximity-based extraction and tag-density analysis.
 */

console.log('%cPDTK: Deep Traversal Starting...', 'background: #0073b1; color: white; padding: 2px 5px; border-radius: 3px;');

/**
 * Searches for the primary text content of a section.
 */
function extractSectionContent(sectionId) {
    const anchor = document.querySelector(`#${sectionId}`);
    if (!anchor) return '';

    const section = anchor.closest('section');
    if (!section) return '';

    // Strategy 1: Find the largest visible text block that isn't the title
    const textNodes = Array.from(section.querySelectorAll('span[aria-hidden="true"], div.inline-show-more-text'))
        .map(el => el.innerText.trim())
        .filter(text => text.length > 0 && text !== 'About' && text !== 'Projects' && text !== 'Skills');

    // Pick the longest one - usually the summary or description
    return textNodes.reduce((a, b) => (a.length > b.length ? a : b), '').replace(/…see more/g, '').trim();
}

/**
 * Specifically finds list-based items in a section.
 */
function extractListItems(sectionId) {
    const anchor = document.querySelector(`#${sectionId}`);
    if (!anchor) return [];

    const section = anchor.closest('section');
    if (!section) return [];

    const items = [];
    // LinkedIn nested lists are usually .pvs-list__item--line-separated or .pvs-entity
    const listContainers = section.querySelectorAll('li, .pvs-list__item--one-column');

    listContainers.forEach(container => {
        // Find all visible spans
        const spans = Array.from(container.querySelectorAll('span[aria-hidden="true"]'))
            .map(s => s.innerText.trim())
            .filter(t => t.length > 0 && !['Show all', 'Projects', 'Skills'].includes(t));

        if (spans.length > 0) {
            // Usually the first span is the title
            const title = spans[0];
            // The rest might be description or metadata
            const description = spans.slice(1).join(' | ');

            if (title && title.length > 1) {
                items.push({ title, description });
            }
        }
    });

    return items.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
}

/**
 * Special handling for skills which are usually just strings.
 */
function extractSkills() {
    const anchor = document.querySelector('#skills');
    if (!anchor) return [];

    const section = anchor.closest('section');
    if (!section) return [];

    const skills = Array.from(section.querySelectorAll('span[aria-hidden="true"]'))
        .map(s => s.innerText.trim())
        .filter(t => t.length > 1 && !['Skills', 'Show all', 'Endorsements'].some(k => t.includes(k)));

    return [...new Set(skills)];
}

function getExtractedPayload() {
    const data = {
        name: document.querySelector('h1')?.innerText?.trim() || 'User',
        profile_url: window.location.href,
        about: extractSectionContent('about'),
        projects: extractListItems('projects'),
        skills: extractSkills(),
        synced_at: new Date().toISOString()
    };

    return data;
}

function updateLivePreview() {
    const preview = document.getElementById('pdtk-preview-content');
    if (!preview) return;

    const data = getExtractedPayload();

    const aboutStatus = data.about ? `✅ Found (${data.about.length} chars)` : '❌ Missing';
    const projectsStatus = data.projects.length > 0 ? `✅ ${data.projects.length} Found` : '❌ 0 Found';
    const skillsStatus = data.skills.length > 0 ? `✅ ${data.skills.length} Found` : '❌ 0 Found';

    preview.innerHTML = `
        <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
            <strong>${data.name}</strong>
        </div>
        <div style="font-size: 11px; line-height: 1.4;">
            <div>About: <span style="color: ${data.about ? '#28a745' : '#dc3545'}">${aboutStatus}</span></div>
            <div>Projects: <span style="color: ${data.projects.length ? '#28a745' : '#dc3545'}">${projectsStatus}</span></div>
            <div>Skills: <span style="color: ${data.skills.length ? '#28a745' : '#dc3545'}">${skillsStatus}</span></div>
        </div>
        ${data.projects.length > 0 ? `<div style="font-size: 9px; color: #888; margin-top: 4px;">Latest Project: ${data.projects[0].title}</div>` : ''}
    `;
}

function injectPDTKPanel() {
    if (document.getElementById('pdtk-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'pdtk-panel';
    panel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999999;
        background: white; border-radius: 12px; border: 2px solid #0073b1;
        width: 250px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        padding: 16px; font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    `;

    const title = document.createElement('div');
    title.innerHTML = 'PDTK Sync Engine <span style="float:right; font-size:10px; color:#999;">v2.0</span>';
    title.style.fontWeight = 'bold';
    title.style.color = '#0073b1';
    title.style.marginBottom = '12px';
    panel.appendChild(title);

    const content = document.createElement('div');
    content.id = 'pdtk-preview-content';
    panel.appendChild(content);

    const btn = document.createElement('button');
    btn.innerText = 'SYNC TO PDTK';
    btn.style.cssText = `
        width: 100%; margin-top: 15px; background: #0073b1; color: white;
        border: none; border-radius: 8px; padding: 12px; cursor: pointer;
        font-weight: bold; font-size: 13px; letter-spacing: 0.5px;
    `;

    btn.onclick = () => {
        const data = getExtractedPayload();
        btn.innerText = 'SYNCING...';
        btn.disabled = true;

        fetch('http://localhost:4000/pdtk/linkedin/sync', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(r => {
                if (r.ok) {
                    btn.innerText = 'SYNC SUCCESS!';
                    btn.style.background = '#28a745';
                } else {
                    throw new Error();
                }
            })
            .catch(() => {
            btn.innerText = 'SYNC FAILED';
            btn.style.background = '#dc3545';
        })
        .finally(() => {
            setTimeout(() => {
                btn.innerText = 'SYNC TO PDTK';
                btn.style.background = '#0073b1';
                btn.disabled = false;
                updateLivePreview();
            }, 3000);
        });
    };

    panel.appendChild(btn);
    document.body.appendChild(panel);

    // Dynamic Updates — throttled to avoid excessive DOM queries
    setInterval(updateLivePreview, 5000);
}

// Manual trigger for users who don't want to wait
window.PDTK_EXTRACT = () => {
    const data = getExtractedPayload();
    console.log('PDTK Diagnostic Data:', data);
    return data;
};

setTimeout(injectPDTKPanel, 2000);
