// CONFIGURATION
const HOVER_DELAY = 100; // Time in milliseconds before expansion
const SESSION_KEY = 'mtvarch_verified'; // sessionStorage key for verification

// Check if user is verified on page load
function checkVerification() {
    const verified = sessionStorage.getItem(SESSION_KEY);

    if (!verified || verified !== 'true') {
        showPasswordModal();
        return false;
    }

    return true;
}

// Set verification
function setVerified() {
    sessionStorage.setItem(SESSION_KEY, 'true');
}

// Clear verification
function clearVerification() {
    sessionStorage.removeItem(SESSION_KEY);
}

// Show password verification modal
function showPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.classList.remove('hidden');
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 100);
        }
    }
}

// Hide password verification modal
function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.classList.add('hidden');
    }
}

// Verify password with server
async function verifyPassword(password) {
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, serviceName: 'adea' })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[ERROR] Verification failed:', error);
        return { valid: false, debug: 'conn_err' };
    }
}

// Load library data (global function)
function loadLibrary() {
    fetch('/api/data')
        .then(res => res.json())
        .then(data => {
            if (typeof renderCategories === 'function') {
                allItems = data.library;
                renderCategories(data.config.categories, allItems);
            }
        })
        .catch(err => console.error('Error loading library:', err));
}

// Global reference for renderCategories and allItems (set inside DOMContentLoaded)
let renderCategories = null;
let allItems = null;

// Initialize password verification form
function initPasswordVerification() {
    const verifyForm = document.getElementById('verify-form');
    if (!verifyForm) return;

    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rawInput = document.getElementById('password').value;
        const password = rawInput.trim();

        console.log(`[DEBUG] Password length (raw): ${rawInput.length}`);
        console.log(`[DEBUG] Password length (trimmed): ${password.length}`);

        if (!password) {
            showError('Password cannot be empty');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const btnLoader = document.getElementById('btn-loader');
        const errorMessage = document.getElementById('error-message');

        // UI state - loading
        submitBtn.disabled = true;
        btnText.textContent = 'Verifying...';
        btnLoader.classList.remove('hidden');
        errorMessage.style.display = 'none';

        try {
            const data = await verifyPassword(password);

            if (data.valid) {
                // Success - store verification with expiry and hide modal
                console.log('[SUCCESS] Access granted');
                setVerified();
                hidePasswordModal();
                // Clear password field
                document.getElementById('password').value = '';
                // Load content now that user is verified
                loadLibrary();
            } else {
                // Failed verification
                let errorMsg = 'Invalid password. Please try again.';
                if (data.debug === 'conn_err') {
                    errorMsg = 'Connection error. Please try again later.';
                }
                showError(errorMsg);
            }
        } catch (error) {
            console.error('[ERROR] Verification failed:', error);
            showError('Connection failed. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.textContent = 'Verify Access';
            btnLoader.classList.add('hidden');
        }
    });

    function showError(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';

        // Clear and focus password field for easy retry
        const pwdField = document.getElementById('password');
        pwdField.value = '';
        pwdField.focus();
        pwdField.select();
    }
}

// Row Scroller Drag Functionality
function initRowScrollers() {
    const rowScrollers = document.querySelectorAll('.row-scroller');

    rowScrollers.forEach(scroller => {
        // Skip if already initialized
        if (scroller.dataset.initialized === 'true') return;
        scroller.dataset.initialized = 'true';

        let isDown = false;
        let startX;
        let scrollLeft;
        let animationFrameId = null;
        let hasDragged = false;
        let moveThreshold = 10; // Minimum pixels to consider it a drag
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let totalDragDistance = 0;
        let shouldPreventClick = false;

        // Mouse down - start dragging
        scroller.addEventListener('mousedown', (e) => {
            // Only respond to left mouse button
            if (e.button !== 0) return;
            
            isDown = true;
            hasDragged = false;
            totalDragDistance = 0;
            shouldPreventClick = false;
            scroller.classList.add('grabbing');
            startX = e.pageX - scroller.getBoundingClientRect().left;
            scrollLeft = scroller.scrollLeft;
            lastX = startX;
            lastTime = Date.now();
            velocity = 0;
            
            // Cancel any ongoing animation
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Add global listeners for drag (so it works even when mouse leaves the scroller)
            document.addEventListener('mousemove', onMouseMove, true);
            document.addEventListener('mouseup', onMouseUp, true);
        });

        // Handle mouse up globally
        function onMouseUp(e) {
            isDown = false;
            scroller.classList.remove('grabbing');
            
            // Apply velocity-based inertia if we were dragging
            if (hasDragged && Math.abs(velocity) > 0.5) {
                animateInertia();
            }
            
            // Mark that we should prevent the upcoming click event
            if (totalDragDistance > moveThreshold) {
                shouldPreventClick = true;
            }
            
            // Remove global listeners
            document.removeEventListener('mousemove', onMouseMove, true);
            document.removeEventListener('mouseup', onMouseUp, true);
        }

        // Handle mouse move globally
        function onMouseMove(e) {
            e.preventDefault();

            const x = e.pageX - scroller.getBoundingClientRect().left;
            const walk = x - startX; // 1:1 natural drag

            // Only start dragging if we've moved past the threshold
            if (!hasDragged && Math.abs(walk) > moveThreshold) {
                hasDragged = true;
            }

            // Only scroll if we're in drag mode (past threshold)
            if (!hasDragged) return;

            // Calculate velocity and track total drag distance
            const now = Date.now();
            const deltaTime = now - lastTime;
            if (deltaTime > 0) {
                velocity = (x - lastX) / deltaTime * 16; // Normalize to ~60fps
            }
            totalDragDistance += Math.abs(x - lastX);
            lastX = x;
            lastTime = now;

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = requestAnimationFrame(() => {
                scroller.scrollLeft = scrollLeft - walk; // Inverted for natural drag
            });
        }

        // Prevent click on cards if we dragged
        scroller.addEventListener('click', (e) => {
            if (shouldPreventClick) {
                shouldPreventClick = false; // Reset for next time
                e.stopPropagation();
                e.preventDefault();
            }
        }, true);

        // Prevent default drag behavior on images and cards
        scroller.addEventListener('dragstart', (e) => {
            e.preventDefault();
        }, true);

        // Animate inertia after release
        function animateInertia() {
            let currentVelocity = velocity;
            const friction = 0.95; // Velocity decay per frame
            
            function step() {
                currentVelocity *= friction;
                scroller.scrollLeft -= currentVelocity;
                
                // Continue if velocity is still significant
                if (Math.abs(currentVelocity) > 0.5) {
                    animationFrameId = requestAnimationFrame(step);
                } else {
                    animationFrameId = null;
                }
            }
            
            step();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const searchInput = document.getElementById('searchInput');

    // Initialize password verification
    initPasswordVerification();

    // Modal Elements
    const modal = document.getElementById('infoModal');
    const closeBtn = document.querySelector('.close-btn');
    const playBtn = document.getElementById('playBtn');
    const seasonsContainer = document.getElementById('seasonsContainer');

    // Modal Data Fields
    const mImg = document.getElementById('modalImg');
    const mTitle = document.getElementById('modalTitle');
    const mDesc = document.getElementById('modalDesc');
    const mDur = document.getElementById('modalDuration');
    const mFmt = document.getElementById('modalFormat');
    const mTags = document.getElementById('modalTags');

    let currentItem = null;
    let currentEpisode = null;
    let hoverTimeout = null;

    // Check if user is verified and load library
    const isVerified = checkVerification();
    if (isVerified) {
        loadLibrary();
    }

    // 2. Render Functions - assign to global variable
    renderCategories = function(categories, items) {
        app.innerHTML = '';

        categories.forEach(cat => {
            const catItems = items.filter(item => item.tags.includes(cat.filterTag));

            if(catItems.length > 0) {
                const section = document.createElement('section');
                section.className = 'category-section';

                const title = document.createElement('h3');
                title.className = 'category-title';
                title.innerText = cat.title;

                // Check if this is search results (use grid layout)
                const isSearch = cat.filterTag === 'search_override';
                const container = document.createElement('div');
                container.className = isSearch ? 'search-grid' : 'row-scroller';

                catItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'video-card';

                    // Determine if item is a movie or TV show for display
                    let cardContent;
                    if (item.type === 'tvshow') {
                        // For TV shows, show show info
                        cardContent = `
                            <img class="card-thumbnail" src="${getAssetPath(item.thumbnail)}" alt="${item.title}" draggable="false">
                            <div class="card-info-preview">
                                <h4>${item.title}</h4>
                                <div class="separator"></div>
                                <p class="preview-desc">${item.description}</p>
                                <div class="separator"></div>
                                <div class="tags-container">
                                    <span class="tag-badge">TV Show</span>
                                    <span class="tag-badge">${item.year}</span>
                                    ${item.tags.filter(t => !['tvshow', 'movie', 'flash-drive'].includes(t.toLowerCase())).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join('')}
                                </div>
                            </div>
                        `;
                    } else {
                        // For movies, show movie info
                        cardContent = `
                            <img class="card-thumbnail" src="${getAssetPath(item.thumbnail)}" alt="${item.title}" draggable="false">
                            <div class="card-info-preview">
                                <h4>${item.title}</h4>
                                <div class="separator"></div>
                                <p class="preview-desc">${item.description}</p>
                                <div class="separator"></div>
                                <div class="tags-container">
                                    <span class="tag-badge">Movie</span>
                                    <span class="tag-badge">${item.year}</span>
                                    ${item.tags.filter(t => !['tvshow', 'movie', 'flash-drive'].includes(t.toLowerCase())).slice(0, 2).map(t => `<span class="tag-badge">${t}</span>`).join('')}
                                </div>
                            </div>
                        `;
                    }

                    // Inline Content Construction
                    card.innerHTML = cardContent;

                    // Click to Open Modal - Handle both movies and TV shows
                    card.onclick = () => {
                        if (item.type === 'tvshow') {
                            openTvShowModal(item);
                        } else {
                            openMovieModal(item);
                        }
                    };

                    // Hover Interaction - only expand for row cards, not search grid
                    card.onmouseenter = () => {
                        // Don't expand search grid cards
                        if (container.classList.contains('search-grid')) return;
                        
                        hoverTimeout = setTimeout(() => {
                            card.classList.add('expanded');
                        }, HOVER_DELAY);
                    };

                    card.onmouseleave = () => {
                        clearTimeout(hoverTimeout);
                        card.classList.remove('expanded');
                    };

                    container.appendChild(card);
                });

                section.appendChild(title);
                section.appendChild(container);
                app.appendChild(section);
            }
        });
        
        // Re-initialize row scrollers after rendering
        initRowScrollers();
    }

    // 3. Search Logic
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if(!query) {
            fetch('/api/data').then(res => res.json()).then(d => renderCategories(d.config.categories, d.library));
            return;
        }

        // Search function that handles both movies and TV shows
        const filtered = allItems.filter(item => {
            // Check basic fields
            const basicMatch = item.title.toLowerCase().includes(query) ||
                              item.description.toLowerCase().includes(query) ||
                              item.tags.some(t => t.toLowerCase().includes(query));

            if (basicMatch) return true;

            // For TV shows, also search within seasons and episodes
            if (item.type === 'tvshow' && item.seasons) {
                return item.seasons.some(season =>
                    season.episodes.some(episode =>
                        episode.title.toLowerCase().includes(query) ||
                        episode.description.toLowerCase().includes(query)
                    )
                );
            }

            return false;
        });

        // Sort by relevance
        const sorted = filtered.sort((a, b) => {
            const aTitleMatch = a.title.toLowerCase().includes(query) ? 1 : 0;
            const bTitleMatch = b.title.toLowerCase().includes(query) ? 1 : 0;
            
            const aTitleStart = a.title.toLowerCase().startsWith(query) ? 1 : 0;
            const bTitleStart = b.title.toLowerCase().startsWith(query) ? 1 : 0;
            
            const aScore = aTitleStart * 2 + aTitleMatch;
            const bScore = bTitleStart * 2 + bTitleMatch;
            
            return bScore - aScore;
        });

        renderCategories([{ title: "Search Results", filterTag: "search_override" }],
            sorted.map(item => ({...item, tags: [...item.tags, "search_override"]}))
        );
    });

    // 4. Modal Logic for Movies
    function openMovieModal(movie) {
        currentItem = movie;
        currentEpisode = null; // Reset episode

        mImg.src = getAssetPath(movie.thumbnail);
        mTitle.innerText = movie.title;
        mDesc.innerText = movie.description;
        mDur.innerText = movie.duration || '';
        mDur.style.display = movie.duration ? 'inline' : 'none'; // Show/hide based on duration
        mFmt.innerText = 'MOVIE';

        mTags.innerHTML = movie.tags.map(t => `<span class="tag-badge">${t}</span>`).join('');

        // Hide seasons container for movies
        if (seasonsContainer) {
            seasonsContainer.style.display = 'none';
        }

        modal.classList.remove('hidden');
    }

    // 4. Modal Logic for TV Shows
    function openTvShowModal(tvshow) {
        currentItem = tvshow;
        currentEpisode = null; // Reset episode

        mImg.src = getAssetPath(tvshow.thumbnail);
        mTitle.innerText = tvshow.title;
        mDesc.innerText = tvshow.description;
        mDur.innerText = ''; // No duration for TV show container
        mDur.style.display = 'none'; // Hide empty duration box
        mFmt.innerText = 'TV SHOW'; // Indicate it's a TV show

        mTags.innerHTML = tvshow.tags.map(t => `<span class="tag-badge">${t}</span>`).join('');

        // Show seasons container for TV shows
        if (seasonsContainer) {
            seasonsContainer.style.display = 'block';
            renderSeasons(tvshow.seasons);
        }

        modal.classList.remove('hidden');
        
        // Scroll modal to top when opening TV show
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
    
    // Function to render seasons and episodes in the modal
    function renderSeasons(seasons) {
        if (!seasonsContainer) return;

        seasonsContainer.innerHTML = '<h3>Seasons</h3>';

        seasons.forEach(season => {
            const seasonElement = document.createElement('div');
            seasonElement.className = 'season';

            // Check if seasonNumber is a number or text (like "Specials", "Exclusives")
            const seasonTitle = typeof season.seasonNumber === 'number' 
                ? `Season ${season.seasonNumber}` 
                : season.seasonNumber;

            seasonElement.innerHTML = `
                <h4>${seasonTitle}</h4>
                <div class="episodes-list">
                    ${season.episodes.map(episode => `
                        <div class="episode-item" data-season="${season.seasonNumber}" data-episode="${episode.episodeNumber}">
                            <div class="episode-thumb" style="background-image: url('${getAssetPath(episode.thumbnail)}')"></div>
                            <div class="episode-info">
                                <strong>E${episode.episodeNumber}: ${episode.title}</strong>
                                <p>${episode.description}</p>
                                <small>${episode.duration}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Add event listeners to episode items
            const episodeItems = seasonElement.querySelectorAll('.episode-item');
            episodeItems.forEach(item => {
                item.addEventListener('click', () => {
                    const seasonNumRaw = item.getAttribute('data-season');
                    const episodeNum = parseInt(item.getAttribute('data-episode'));

                    // Find the specific episode (handle both numeric and text season numbers)
                    const seasonObj = seasons.find(s => s.seasonNumber == seasonNumRaw);
                    if (seasonObj) {
                        const episode = seasonObj.episodes.find(e => e.episodeNumber === episodeNum);
                        if (episode) {
                            playEpisode(episode);
                        }
                    }
                });
            });

            seasonsContainer.appendChild(seasonElement);
        });
    }
    
    // Function to set current episode and prepare for playback
    function playEpisode(episode) {
        currentEpisode = episode;
        // Update modal to show episode info instead of show info
        mImg.src = getAssetPath(episode.thumbnail);
        
        const seasonObj = currentItem.seasons.find(s => s.episodes.includes(episode));
        const seasonNumber = seasonObj.seasonNumber;
        const episodeNumber = episode.episodeNumber;
        
        // Format season/episode display based on whether season is numeric or text
        let seasonEpisodeDisplay;
        if (typeof seasonNumber === 'number') {
            seasonEpisodeDisplay = `S${seasonNumber} E${episodeNumber}`;
        } else {
            // Text-based season (e.g., "Specials", "Exclusives")
            seasonEpisodeDisplay = `${seasonNumber} E${episodeNumber}`;
        }
        
        mTitle.innerText = `${currentItem.title} - ${seasonEpisodeDisplay} - ${episode.title}`;
        mDesc.innerText = episode.description;
        mDur.innerText = episode.duration;
        mDur.style.display = 'inline'; // Show duration for episodes
        mFmt.innerText = 'EPISODE';

        // Update play button to play the episode
        playBtn.onclick = () => {
            if(!currentEpisode) return;
            window.location.href = `player.html?video=${encodeURIComponent(getAssetPath(currentEpisode.videoUrl))}&format=flat&title=${encodeURIComponent(mTitle.innerText)}`;
        };

        // Scroll modal to top when selecting an episode
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
    
    // Helper function to pad numbers with leading zero
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }

    // Helper function to get the correct asset path
    function getAssetPath(path) {
        // If the path starts with /flash-assets, return as is
        if (path.startsWith('/flash-assets')) {
            return path;
        }
        // Otherwise, return the original path (for backward compatibility)
        return path;
    }

    closeBtn.onclick = () => modal.classList.add('hidden');
    window.onclick = (e) => { if(e.target == modal) modal.classList.add('hidden'); }

    // 5. Playback Logic
    playBtn.onclick = () => {
        if(currentEpisode) {
            // If there's a selected episode, play that
            window.location.href = `player.html?video=${encodeURIComponent(getAssetPath(currentEpisode.videoUrl))}&format=flat&title=${encodeURIComponent(mTitle.innerText)}`;
        } else if(currentItem && currentItem.type !== 'tvshow') {
            // If it's a movie, play the movie
            window.location.href = `player.html?video=${encodeURIComponent(getAssetPath(currentItem.videoUrl))}&format=flat&title=${encodeURIComponent(currentItem.title)}`;
        } else if(currentItem && currentItem.type === 'tvshow') {
            // If it's a TV show but no episode selected, try to play the first episode
            if(currentItem.seasons && currentItem.seasons.length > 0) {
                const firstSeason = currentItem.seasons[0];
                if(firstSeason.episodes && firstSeason.episodes.length > 0) {
                    const firstEpisode = firstSeason.episodes[0];
                    window.location.href = `player.html?video=${encodeURIComponent(getAssetPath(firstEpisode.videoUrl))}&format=flat&title=${encodeURIComponent(`${currentItem.title} - S${padZero(firstSeason.seasonNumber)}E${padZero(firstEpisode.episodeNumber)} - ${firstEpisode.title}`)}`;
                }
            }
        }
    };
});
