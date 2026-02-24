/* Global app + Firebase auth/bootstrap extracted from index.html */
const mobileBottomNavConfig = {
            'Mobility - Physio': [
                { label: 'Home', tab: 'mobilityHome' },
                { label: 'Sessions', tab: 'mobilitySessions' },
                { label: 'Templates', tab: 'mobilityTemplates' },
                { label: 'Calendar', tab: 'mobilityCalendar' }
            ],
            'AI_ML_DS': [
                { label: 'Home', tab: 'aiHome' },
                { label: 'Sessions', tab: 'aiSessions' },
                { label: 'Courses and Books', tab: 'aiCoursesBooks' },
                { label: 'History', tab: 'aiHistory' },
                { label: 'Calendar', tab: 'aiCalendar' },
                { label: 'Journal', tab: 'aiJournal' }
            ],
            'Tennis': [
                { label: 'Home', tab: 'home' },
                { label: 'Sessions', tab: 'sessions' },
                { label: 'Match', tab: 'match' },
                { label: 'History', tab: 'history' },
                { label: 'Calendar', tab: 'calendar' },
                { label: 'Journal', tab: 'journal' }
            ]
        };

        function handleMobileBottomNavClick(button) {
            const tabName = button?.getAttribute('data-target-tab') || '';
            if (!tabName) return;
            switchTab(tabName, button);
        }

        function updateMobileBottomNav(activeTab = '') {
            const nav = document.getElementById('mobileBottomNav');
            if (!nav) return;

            const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
            const config = mobileBottomNavConfig[currentModule] || [];
            const showMobileNav = isMobileViewport && config.length > 0;
            nav.classList.toggle('show', showMobileNav);
            if (showMobileNav) {
                nav.style.display = 'flex';
            }

            const mobileButtons = nav.querySelectorAll('.bottom-nav-btn');
            mobileButtons.forEach((button, index) => {
                const item = config[index];
                if (!item) {
                    button.style.display = 'none';
                    button.style.pointerEvents = 'none';
                    button.setAttribute('data-target-tab', '');
                    button.classList.remove('active');
                    return;
                }

                button.style.display = 'block';
                button.style.pointerEvents = 'auto';
                button.textContent = item.label;
                button.setAttribute('data-target-tab', item.tab);
                button.classList.toggle('active', showMobileNav && item.tab === activeTab);
            });
        }

        function updateMobileTopHeader() {
            const titleEl = document.getElementById('mobileModuleTitle');
            if (!titleEl) return;

            const moduleTitle = currentModule
                ? String(currentModule).replace(/_/g, ' ')
                : 'Dashboard';

            const moduleIconMap = {
                'Dashboard': '\u{1F3E0}',
                'Tennis': '\u{1F3BE}',
                'Mobility - Physio': '\u{1F4AA}',
                'Actuaries': '\u{1F4CA}',
                'Insurance': '\u{1F6E1}\uFE0F',
                'AI ML DS': '\u{1F916}',
                'AI_ML_DS': '\u{1F916}'
            };
            const icon = moduleIconMap[moduleTitle] || '\u{1F4C1}';

            titleEl.innerHTML = `<span aria-hidden="true">${icon}</span><span>${moduleTitle}</span>`;
        }

        function switchTab(tabName, el) {
            const contents = document.querySelectorAll('.tab-content');
            const buttons = document.querySelectorAll('.tab-button');

            contents.forEach(content => content.classList.remove('active'));
            buttons.forEach(button => button.classList.remove('active'));

            const target = document.getElementById(tabName);
            if (target) target.classList.add('active');

            // Initialize calendar when calendar tab is opened
            if (tabName === 'calendar') {
                setTimeout(() => {
                    initCalendar();
                }, 50);
            }

            // Render journal list when journal tab is opened
            if (tabName === 'journal') {
                setTimeout(async () => {
                    await window.firebaseRenderJournalList();
                }, 50);
            }

            if (tabName === 'mobilitySessions') {
                setTimeout(async () => {
                    if (window.firebaseRenderMobilitySessions) await window.firebaseRenderMobilitySessions();
                }, 50);
            }

            if (tabName === 'mobilityTemplates') {
                setTimeout(async () => {
                    if (window.firebaseRenderMobilityTemplates) await window.firebaseRenderMobilityTemplates();
                }, 50);
            }

            if (tabName === 'mobilityCalendar') {
                setTimeout(() => {
                    if (window.initMobilityCalendar) window.initMobilityCalendar();
                }, 50);
            }

            if (tabName === 'actuaryNotes') {
                setTimeout(() => {
                    if (window.initializeActuariesUI) window.initializeActuariesUI();
                    if (window.showActuaryModules) window.showActuaryModules();
                }, 50);
            }

            if (tabName === 'actuaryLearn') {
                setTimeout(() => {
                    if (window.loadLearnQuestions) window.loadLearnQuestions();
                }, 50);
            }

            if (tabName === 'aiSessions') {
                setTimeout(async () => {
                    if (window.loadAIStudySessions) await window.loadAIStudySessions();
                }, 50);
            }

            if (tabName === 'aiCoursesBooks') {
                setTimeout(async () => {
                    if (window.loadAICourses) await window.loadAICourses();
                    if (window.loadAIBooks) await window.loadAIBooks();
                }, 50);
            }

            if (tabName === 'aiHistory') {
                setTimeout(async () => {
                    if (window.loadAIStudyHistory) await window.loadAIStudyHistory();
                }, 50);
            }

            if (tabName === 'aiCalendar') {
                setTimeout(() => {
                    if (window.initAIStudyCalendar) window.initAIStudyCalendar();
                }, 50);
            }

            if (tabName === 'aiJournal') {
                setTimeout(async () => {
                    if (window.loadAIStudyJournal) await window.loadAIStudyJournal();
                }, 50);
            }

            // If an element was provided (nav button or inline button), mark it active
            if (el) {
                el.classList.add('active');
                updateMobileBottomNav(tabName);
                // If the element is a nav button with data-tab, nothing else to do
                return;
            }

            // Otherwise try to find a nav button that matches the tabName and mark it active
            const navBtn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === tabName);
            if (navBtn) navBtn.classList.add('active');
            updateMobileBottomNav(tabName);

            if (currentModule && tabName && tabName !== 'dashboard') {
                persistUIState({ module: currentModule, tab: tabName });
            }
        }

        let designItems = [];
        let editingSessionIndex = null;
        let sessionDataMap = {}; // Map to store session data by ID
        let mobilityTemplateExercises = [];
        let mobilityTemplateEditingId = null;
        let mobilitySessionDataMap = {};
        let mobilityTemplatesCache = [];
        let currentMobilitySessionData = null;
        let currentMobilitySessionId = null;
        let mobilitySessionCheckedItems = {};

        // Make these globally accessible
        window.designItems = designItems;
        window.editingSessionIndex = editingSessionIndex;
        window.sessionDataMap = sessionDataMap;
        window.mobilityTemplateExercises = mobilityTemplateExercises;
        window.mobilityTemplateEditingId = mobilityTemplateEditingId;
        window.mobilitySessionDataMap = mobilitySessionDataMap;
        window.mobilityTemplatesCache = mobilityTemplatesCache;

        function onDesignTypeChange() {
            const type = document.getElementById('designType').value;
            const exerciseGroup = document.getElementById('exerciseGroup');
            const durationGroup = document.getElementById('durationGroup');
            const exerciseLabel = document.getElementById('exerciseLabel');
            if (!type) {
                exerciseGroup.style.display = 'none';
                durationGroup.style.display = 'none';
                return;
            }
            exerciseGroup.style.display = 'block';
            durationGroup.style.display = 'block';
            if (type === 'Conditioning') exerciseLabel.textContent = 'Conditioning Exercise:';
            else if (type === 'Tennis Drills') exerciseLabel.textContent = 'Drill:';
            else if (type === 'Rallies') exerciseLabel.textContent = 'Rally Type:';
            else if (type === 'Match Points') exerciseLabel.textContent = 'Point Drill:';
        }

        function addDesignItem() {
            const type = document.getElementById('designType').value;
            const exercise = document.getElementById('designExercise').value.trim();
            const minutes = parseInt(document.getElementById('designDuration').value, 10);
            if (!type) { alert('Please select a type'); return; }
            if (!exercise) { alert('Please enter the exercise/drill name'); return; }
            if (!minutes || minutes <= 0) { alert('Please enter a valid time in minutes'); return; }
            window.designItems.push({type, exercise, minutes});
            renderDesignItems();
            document.getElementById('morePrompt').style.display = 'block';
        }

        function renderDesignItems() {
            const list = document.getElementById('designItemsList');
            if (!list) return;
            if (window.designItems.length === 0) {
                list.innerHTML = '<li style="color:#666">No items yet</li>';
                return;
            }
            list.innerHTML = window.designItems.map((it,i) => `\n                <li style="margin-bottom:0.5rem;">\n                  <strong>${it.type}</strong> â€” ${it.exercise} â€” ${it.minutes} min\n                  <button style="margin-left:0.75rem;" onclick="removeDesignItem(${i})">Remove</button>\n                </li>`).join('');
        }

        function removeDesignItem(index) {
            window.designItems.splice(index,1);
            renderDesignItems();
            if (window.designItems.length === 0) document.getElementById('morePrompt').style.display = 'none';
        }

        function addAnother() {
            document.getElementById('designExercise').value = '';
            document.getElementById('designDuration').value = '';
            document.getElementById('morePrompt').style.display = 'none';
            document.getElementById('designExercise').focus();
        }

        function finalizeDesignSession() {
            // This will be defined in the module script
            window.firebaseFinalizeDesignSession();
        }

        async function openMobilityTemplateBuilder(templateId = null) {
            const modal = document.getElementById('mobilityTemplateBuilderModal');
            const title = document.getElementById('mobilityTemplateModalTitle');
            const templateNameEl = document.getElementById('mobilityTemplateName');
            if (!modal || !templateNameEl) return;

            window.mobilityTemplateEditingId = templateId;
            const existingTemplate = templateId
                ? (window.mobilityTemplatesCache || []).find(t => t.id === templateId)
                : null;

            if (title) title.textContent = existingTemplate ? 'Edit Template' : 'Create Template';
            templateNameEl.value = existingTemplate?.name || '';
            window.mobilityTemplateExercises = (existingTemplate?.exercises || []).map(exercise => ({
                name: exercise.name || '',
                instructions: exercise.instructions || '',
                sets: Number(exercise.sets) || 1,
                reps: Number(exercise.reps) || 1
            }));

            const nameInput = document.getElementById('mobilityTemplateExerciseName');
            const instructionsInput = document.getElementById('mobilityTemplateExerciseInstructions');
            const setsInput = document.getElementById('mobilityTemplateExerciseSets');
            const repsInput = document.getElementById('mobilityTemplateExerciseReps');
            if (nameInput) nameInput.value = '';
            if (instructionsInput) instructionsInput.value = '';
            if (setsInput) setsInput.value = '';
            if (repsInput) repsInput.value = '';

            renderMobilityTemplateExercises();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeMobilityTemplateBuilder() {
            const modal = document.getElementById('mobilityTemplateBuilderModal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            window.mobilityTemplateEditingId = null;
            window.mobilityTemplateExercises = [];
        }

        function addMobilityTemplateExercise() {
            const name = document.getElementById('mobilityTemplateExerciseName')?.value.trim() || '';
            const instructions = document.getElementById('mobilityTemplateExerciseInstructions')?.value.trim() || '';
            const sets = parseInt(document.getElementById('mobilityTemplateExerciseSets')?.value || '0', 10);
            const reps = parseInt(document.getElementById('mobilityTemplateExerciseReps')?.value || '0', 10);

            if (!name || !instructions || !sets || !reps || sets <= 0 || reps <= 0) {
                alert('Please fill Exercise Name, Instructions, Sets, and Reps with valid values.');
                return;
            }

            window.mobilityTemplateExercises.push({ name, instructions, sets, reps });
            renderMobilityTemplateExercises();

            document.getElementById('mobilityTemplateExerciseName').value = '';
            document.getElementById('mobilityTemplateExerciseInstructions').value = '';
            document.getElementById('mobilityTemplateExerciseSets').value = '';
            document.getElementById('mobilityTemplateExerciseReps').value = '';
        }

        function removeMobilityTemplateExercise(index) {
            window.mobilityTemplateExercises.splice(index, 1);
            renderMobilityTemplateExercises();
        }

        function renderMobilityTemplateExercises() {
            const listEl = document.getElementById('mobilityTemplateExercisesList');
            if (!listEl) return;

            if (!window.mobilityTemplateExercises || window.mobilityTemplateExercises.length === 0) {
                listEl.innerHTML = '<li style="color:#666;padding:0.5rem 0;">No exercises added yet.</li>';
                return;
            }

            listEl.innerHTML = window.mobilityTemplateExercises.map((exercise, index) => `
                <li style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.7rem;padding:0.65rem 0.8rem;border:1px solid #eef4f8;border-radius:8px;margin-bottom:0.55rem;background:linear-gradient(180deg,#fbfdff,#ffffff);">
                    <div>
                        <div style="font-weight:600;color:#0f2540;">${exercise.name}</div>
                        <div style="font-size:0.9rem;color:var(--muted);">Sets: ${exercise.sets} | Reps: ${exercise.reps}</div>
                    </div>
                    <button class="submit-btn btn-danger btn-sm" onclick="removeMobilityTemplateExercise(${index})">Remove</button>
                </li>
            `).join('');
        }

        async function saveMobilityTemplateFromModal() {
            const name = document.getElementById('mobilityTemplateName')?.value.trim() || '';
            if (!name) {
                alert('Template Name is required.');
                return;
            }
            if (!window.mobilityTemplateExercises || window.mobilityTemplateExercises.length === 0) {
                alert('Please add at least one exercise.');
                return;
            }

            const payload = {
                name,
                exercises: window.mobilityTemplateExercises.map(exercise => ({
                    name: exercise.name,
                    instructions: exercise.instructions,
                    sets: exercise.sets,
                    reps: exercise.reps
                }))
            };

            if (window.mobilityTemplateEditingId) {
                await window.firebaseUpdateMobilityTemplate(window.mobilityTemplateEditingId, payload);
            } else {
                await window.firebaseAddMobilityTemplate(payload);
            }

            closeMobilityTemplateBuilder();
            if (window.firebaseRenderMobilityTemplates) await window.firebaseRenderMobilityTemplates();
        }

        async function populateMobilityDesignTemplateSelect(selectedTemplateId = '') {
            const selectEl = document.getElementById('mobilityDesignTemplateSelect');
            if (!selectEl) return;

            let templates = window.mobilityTemplatesCache || [];
            if (!templates.length && window.firebaseGetMobilityTemplates) {
                templates = await window.firebaseGetMobilityTemplates();
                window.mobilityTemplatesCache = templates;
            }

            selectEl.innerHTML = '<option value="">Select template...</option>';
            templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name || 'Untitled Template';
                selectEl.appendChild(option);
            });

            if (selectedTemplateId) {
                selectEl.value = selectedTemplateId;
            }
        }

        async function openMobilityDesignSessionModal(templateId = '') {
            const modal = document.getElementById('mobilityDesignSessionModal');
            const dateEl = document.getElementById('mobilityDesignSessionDate');
            if (!modal || !dateEl) return;

            await populateMobilityDesignTemplateSelect(templateId);
            dateEl.value = new Date().toISOString().split('T')[0];
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeMobilityDesignSessionModal() {
            const modal = document.getElementById('mobilityDesignSessionModal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        async function createMobilitySessionFromDesign() {
            const date = document.getElementById('mobilityDesignSessionDate')?.value || '';
            const templateId = document.getElementById('mobilityDesignTemplateSelect')?.value || '';

            if (!date) return alert('Please select a date.');
            if (!templateId) return alert('Please select a template.');

            await window.firebaseCreateMobilitySession(templateId, date);
            closeMobilityDesignSessionModal();
            const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === 'mobilitySessions');
            switchTab('mobilitySessions', btn || null);
        }

        function openMobilitySessionExecution(sessionData, sessionId = null) {
            if (!sessionData) {
                alert('Mobility session data not found');
                return;
            }

            currentMobilitySessionId = sessionId;
            currentMobilitySessionData = sessionData;
            mobilitySessionCheckedItems = {};

            const dateEl = document.getElementById('mobilityModalSessionDate');
            const listEl = document.getElementById('mobilityModalItemsList');
            const modal = document.getElementById('mobilitySessionModal');

            if (!dateEl || !listEl || !modal) return;

            const templateEl = document.getElementById('mobilityModalTemplateName');
            dateEl.textContent = sessionData.date || '';
            if (templateEl) templateEl.textContent = sessionData.templateName || '';
            listEl.innerHTML = (sessionData.exercises || []).map((item, idx) => `
                <li id="mobility-item-${idx}" style="display:flex;align-items:flex-start;gap:0.85rem;padding:0.95rem;border-radius:10px;background:linear-gradient(180deg,#fbfdff,#ffffff);border:1px solid #eef4f8;margin-bottom:0.8rem;">
                    <input type="checkbox" style="width:20px;height:20px;margin-top:0.1rem;" onchange="toggleMobilityItemCheck(${idx})">
                    <div>
                        <div style="font-weight:600;color:#0f2540;">${item.name}</div>
                        <div style="font-size:0.92rem;color:var(--muted);">Sets: ${item.sets} | Reps: ${item.reps}</div>
                        <div style="font-size:0.85rem;color:var(--muted);margin-top:0.25rem;">${item.instructions || 'No instructions added.'}</div>
                    </div>
                </li>
            `).join('');

            updateSessionProgress('#mobilitySessionModal', '#mobilityModalItemsList');

            modal.style.display = 'flex';
            modal.scrollTop = 0;
            document.body.style.overflow = 'hidden';
        }

        function startMobilitySession(sessionId) {
            const sessionData = window.mobilitySessionDataMap[sessionId];
            openMobilitySessionExecution(sessionData, sessionId);
        }

        function editMobilitySessionDate(sessionId) {
            const session = window.mobilitySessionDataMap[sessionId];
            if (!session) return;

            const nextDate = prompt('Update session date (YYYY-MM-DD):', session.date || '');
            if (nextDate === null) return;
            const trimmedDate = nextDate.trim();
            if (!trimmedDate) {
                alert('Date is required.');
                return;
            }

            window.firebaseUpdateMobilitySession(sessionId, { date: trimmedDate });
        }

        function toggleMobilityItemCheck(index) {
            const itemEl = document.getElementById(`mobility-item-${index}`);
            const checkbox = itemEl?.querySelector('input[type="checkbox"]');
            if (!itemEl || !checkbox) return;

            if (checkbox.checked) {
                mobilitySessionCheckedItems[index] = true;
                itemEl.style.opacity = '0.65';
                itemEl.style.background = 'rgba(26, 188, 156, 0.15)';
            } else {
                delete mobilitySessionCheckedItems[index];
                itemEl.style.opacity = '1';
                itemEl.style.background = 'linear-gradient(180deg,#fbfdff,#ffffff)';
            }

            updateSessionProgress('#mobilitySessionModal', '#mobilityModalItemsList');
        }

        function closeMobilitySessionModal() {
            const modal = document.getElementById('mobilitySessionModal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            currentMobilitySessionData = null;
            currentMobilitySessionId = null;
            mobilitySessionCheckedItems = {};
        }

        async function finishMobilitySession() {
            if (!currentMobilitySessionData) {
                alert('No mobility session loaded');
                return;
            }

            const totalCount = (currentMobilitySessionData.exercises || []).length;
            const completedCount = Object.keys(mobilitySessionCheckedItems).length;

            if (completedCount < totalCount) {
                if (!confirm(`You still have ${totalCount - completedCount} unfinished item(s). Finish anyway?`)) {
                    return;
                }
            }

            if (currentMobilitySessionId) {
                await window.firebaseUpdateMobilitySession(currentMobilitySessionId, { status: 'completed' });
            }
            closeMobilitySessionModal();
            if (window.firebaseRenderMobilitySessions) await window.firebaseRenderMobilitySessions();
            if (window.initMobilityCalendar) window.initMobilityCalendar();
        }

        function renderSessionsList() {
            // This will be defined in the module script
            window.firebaseRenderSessionsList();
        }

        function editSession(docId) {
            // This will be defined in the module script
            window.firebaseEditSession(docId);
        }

        function deleteSession(docId) {
            // This will be defined in the module script
            window.firebaseDeleteSession(docId);
        }

        function planSession() {
            const name = document.getElementById('sessionName').value;
            const date = document.getElementById('sessionDate').value;
            const duration = document.getElementById('sessionDuration').value;
            const type = document.getElementById('sessionType').value;
            
            if (!name || !date || !duration) {
                alert('Please fill in all required fields');
                return;
            }
            
            alert(`Session "${name}" planned for ${date}!`);
            document.querySelector('form').reset();
        }

        // Session Modal Functions
        let currentSessionData = null;
        let currentSessionId = null; // Store the session ID for deletion
        let sessionCheckedItems = {};

        function updateSessionProgress(modalSelector = '#sessionModal', listSelector = '#modalItemsList') {
            const modal = document.querySelector(modalSelector);
            if (!modal) return;

            const items = modal.querySelectorAll(`${listSelector} li input[type="checkbox"]`);
            const label = modal.querySelector('#sessionProgressLabel');
            const fill = modal.querySelector('#sessionProgressFill');

            if (!label || !fill) return;

            if (!items.length) {
                label.textContent = '0 of 0 completed';
                fill.style.width = '0%';
                fill.style.background = 'linear-gradient(90deg,#22c55e,#16a34a)';
                return;
            }

            const total = items.length;
            let completed = 0;

            items.forEach(cb => {
                if (cb.checked) completed++;
            });

            const percent = (completed / total) * 100;
            label.textContent = `${completed} of ${total} completed`;
            fill.style.width = percent + '%';

            if (completed === total) {
                fill.style.background = 'linear-gradient(90deg,#16a34a,#15803d)';
            } else {
                fill.style.background = 'linear-gradient(90deg,#22c55e,#16a34a)';
            }
        }

        function startSessionById(sessionId) {
            const sessionData = window.sessionDataMap[sessionId];
            if (!sessionData) {
                alert('Session data not found');
                return;
            }
            currentSessionId = sessionId; // Store the ID
            openSessionModal(sessionData);
        }

        function openSessionModal(sessionData) {
            currentSessionData = sessionData;
            sessionCheckedItems = {};

            // Populate header
            document.getElementById('modalSessionDate').textContent = sessionData.date;
            document.getElementById('modalSessionTitle').textContent = 'Session Checklist';

            // Render items
            const list = document.getElementById('modalItemsList');
            list.innerHTML = sessionData.items.map((item, idx) => `
                <li id="item-${idx}">
                    <input type="checkbox" onchange="toggleItemCheck(${idx})">
                    <span class="item-text">${item.type} â€” ${item.exercise} â€” ${item.minutes} min</span>
                </li>
            `).join('');

            updateSessionProgress('#sessionModal', '#modalItemsList');

            // Show modal
            const modal = document.getElementById('sessionModal');
            modal.style.display = 'flex';
            modal.scrollTop = 0;
            document.body.style.overflow = 'hidden';
        }

        function closeSessionModal() {
            document.getElementById('sessionModal').style.display = 'none';
            document.body.style.overflow = 'auto';
            currentSessionData = null;
            currentSessionId = null; // Clear the ID
            sessionCheckedItems = {};
        }

        function toggleItemCheck(index) {
            const checkbox = document.querySelector(`#item-${index} input[type="checkbox"]`);
            const item = document.getElementById(`item-${index}`);

            if (checkbox.checked) {
                sessionCheckedItems[index] = true;
                item.classList.add('checked');
            } else {
                delete sessionCheckedItems[index];
                item.classList.remove('checked');
            }

            updateSessionProgress('#sessionModal', '#modalItemsList');
        }

        function finishSession() {
            if (!currentSessionData) {
                alert('No session data loaded');
                return;
            }
            const totalItems = currentSessionData.items.length;
            const checkedCount = Object.keys(sessionCheckedItems).length;

            if (checkedCount < totalItems) {
                // Show confirm dialog
                const confirmText = `You have ${totalItems - checkedCount} unfinished item(s). Finish anyway?`;
                if (!confirm(confirmText)) {
                    return;
                }
            }

            // Save to history collection
            window.firebaseSaveSessionToHistory(currentSessionData, checkedCount, totalItems, currentSessionId);
        }

        async function saveMatchRecord() {
            const date = document.getElementById('matchDate').value;
            const opponent = document.getElementById('opponentName').value.trim();
            const score = document.getElementById('matchScore').value.trim();
            const result = document.getElementById('matchResult').value;

            if (!date) { alert('Please select a match date'); return; }
            if (!opponent) { alert('Please enter opponent name'); return; }
            if (!score) { alert('Please enter the score'); return; }
            if (!result) { alert('Please select the match result'); return; }

            if (currentMatchEditId) {
                await window.firebaseUpdateMatchRecord(currentMatchEditId, {
                    date,
                    opponent,
                    score,
                    result
                });
                currentMatchEditId = null;
                document.getElementById('matchForm').reset();
                setMatchEditMode(false);
            } else {
                window.firebaseSaveMatchRecord({
                    date,
                    opponent,
                    score,
                    result
                });
            }
        }

        function setMatchEditMode(isEditing) {
            const saveBtn = document.getElementById('matchSaveBtn');
            const cancelBtn = document.getElementById('matchCancelEditBtn');
            if (!saveBtn || !cancelBtn) return;
            if (isEditing) {
                saveBtn.textContent = 'Update Match Record';
                cancelBtn.style.display = 'inline-block';
            } else {
                saveBtn.textContent = 'Save Match Record';
                cancelBtn.style.display = 'none';
            }
        }

        function cancelMatchEdit() {
            currentMatchEditId = null;
            document.getElementById('matchForm').reset();
            setMatchEditMode(false);
        }

        function clearTrainingHistory() {
            if (!confirm('Are you sure you want to clear all training session history? This action cannot be undone.')) {
                return;
            }
            window.firebaseClearTrainingHistory();
        }

        function clearMatchHistory() {
            if (!confirm('Are you sure you want to clear all match records? This action cannot be undone.')) {
                return;
            }
            window.firebaseClearMatchHistory();
        }

        function applyHistoryFilters() {
            if (window.firebaseRenderHistoryList) window.firebaseRenderHistoryList();
            if (window.firebaseRenderMatchHistory) window.firebaseRenderMatchHistory();
        }

        function applyJournalFilters() {
            if (window.firebaseRenderJournalList) window.firebaseRenderJournalList();
        }

        // Authentication Functions
        let currentUserId = null;
        let currentUsername = null;
        let currentModule = null;
        let currentMatchEditId = null;
        let currentHistoryEditId = null;
        let insuranceActs = [];
        let insuranceProvisions = [];
        let insuranceActiveActId = null;
        let insuranceProvisionEditId = null;
        let insuranceActEditId = null;
        let insurersDropdownLoaded = false;
        let loadedInsurerCollection = '';
        let insurerPremiumChart = null;
        let currentInsurerData = null;
        let insuranceHandbookCategory = null;
        let selectedInsurer = '';
        let selectedInfoType = '';
        let selectedSegment = '';
        let selectedTimeline = 'all_years';
        let currentMetricRows = [];
        let currentMetricLabel = '';
        let currentMetricType = '';
        const segmentOptions = ['fire', 'marine', 'motor', 'health_pa_travel', 'others'];
        let moduleAccessState = {
            insuranceOnlyUser: false,
            allowedModules: null
        };

        const insuranceCompanies = [];

        const insuranceConcepts = [
            {
                name: 'Solvency Margin',
                explanation: 'A cushion of assets over liabilities that shows financial strength.',
                relevance: 'Critical for policyholder protection and regulatory compliance monitoring.'
            },
            {
                name: 'Combined Ratio',
                explanation: 'Claims plus expenses divided by premium for non-life insurers.',
                relevance: 'Indicates underwriting profitability before investment income.'
            },
            {
                name: 'Embedded Value',
                explanation: 'Present value of future profits plus adjusted net worth in life insurance.',
                relevance: 'Used to evaluate long-term value creation and pricing discipline.'
            }
        ];

        let insuranceNotes = [
            {
                title: 'Nomination Checks in Claims',
                date: '2026-02-01',
                preview: 'Need nominee verification checklist before settlement recommendation.',
                body: 'Review KYC, nomination endorsement date, and legal heir interactions in disputed claims.'
            },
            {
                title: 'Quarterly Solvency Review',
                date: '2026-02-10',
                preview: 'Compare solvency trend with product mix shifts and reserve assumptions.',
                body: 'Track solvency drivers: claim reserve strengthening, premium growth pace, and investment volatility.'
            }
        ];

        let insuranceChatMessages = [
            {
                role: 'ai',
                text: 'Insurance Assistant ready. Ask about provisions, solvency, or company indicators.'
            }
        ];

        const UI_STATE_STORAGE_KEY = 'tennis_ui_state';

        function createInsuranceEntityId(prefix) {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }

        function escapeInsuranceHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function splitCommaValues(raw) {
            return String(raw || '')
                .split(',')
                .map(part => part.trim())
                .filter(Boolean);
        }

        function joinCommaValues(values) {
            return (values || []).join(', ');
        }

        function getInsuranceActiveAct() {
            return insuranceActs.find(act => act.actId === insuranceActiveActId) || null;
        }

        function getInsuranceProvisionsForAct(actId) {
            return insuranceProvisions.filter(provision => provision.actId === actId);
        }

        async function initializeInsuranceModule() {
            if (window.firebaseLoadInsuranceActsAndProvisions) {
                await window.firebaseLoadInsuranceActsAndProvisions();
            }
            renderInsuranceActs();
            openInsuranceActsScreen();
            renderInsuranceCompanies();
            loadInsurersDropdown();
            renderInsuranceConcepts();
            renderInsuranceNotes();
            renderInsuranceChatMessages();
            setInsuranceDefaultNoteDate();
            showInsuranceHome();
        }

        function showInsuranceHome() {
            showInsuranceView('home');
        }

        function getInsuranceHandbookCategoryLabel(category) {
            const labels = {
                life: 'Life',
                general: 'General',
                health: 'Health',
                reinsurance: 'Reinsurance',
                intermediaries: 'Intermediaries'
            };
            return labels[String(category || '').toLowerCase()] || 'Module';
        }

        function getInsurerMasterCollectionForCategory(category = insuranceHandbookCategory) {
            const normalizedCategory = String(category || '').toLowerCase();
            if (normalizedCategory === 'general') {
                return 'insurers_master_nonlife';
            }
            return 'insurers_master';
        }

        function showInsuranceHandbookCategories() {
            insuranceHandbookCategory = null;
            selectedInsurer = '';
            selectedInfoType = '';
            selectedSegment = '';
            resetTimelineState();
            hideTimelineControl();
            hideSegmentDropdown();

            const grid = document.getElementById('insuranceHandbookCategoryGrid');
            const lifeView = document.getElementById('insuranceHandbookLifeView');
            const placeholderView = document.getElementById('insuranceHandbookPlaceholderView');

            if (grid) grid.style.display = 'grid';
            if (lifeView) lifeView.style.display = 'none';
            if (placeholderView) placeholderView.style.display = 'none';
        }

        function showInsuranceHandbookCategory(category) {
            insuranceHandbookCategory = String(category || '').toLowerCase();

            const grid = document.getElementById('insuranceHandbookCategoryGrid');
            const lifeView = document.getElementById('insuranceHandbookLifeView');
            const placeholderView = document.getElementById('insuranceHandbookPlaceholderView');

            if (grid) grid.style.display = 'none';

            if (insuranceHandbookCategory === 'life' || insuranceHandbookCategory === 'general') {
                if (lifeView) lifeView.style.display = 'block';
                if (placeholderView) placeholderView.style.display = 'none';
                currentInsurerData = null;
                selectedInsurer = '';
                selectedInfoType = '';
                selectedSegment = '';
                resetTimelineState();
                hideTimelineControl();
                refreshInsuranceInfoTypeOptions();
                loadInsurersDropdown();
                return;
            }

            if (lifeView) lifeView.style.display = 'none';
            if (placeholderView) placeholderView.style.display = 'block';

            const titleEl = document.getElementById('insuranceHandbookPlaceholderTitle');
            const textEl = document.getElementById('insuranceHandbookPlaceholderText');
            const categoryLabel = getInsuranceHandbookCategoryLabel(insuranceHandbookCategory);

            if (titleEl) titleEl.textContent = categoryLabel;
            if (textEl) textEl.textContent = `${categoryLabel} handbook statistics section.`;
        }

        function showInsuranceView(viewName) {
            const viewMap = {
                home: 'insuranceHomeView',
                provisions: 'insuranceProvisionsView',
                companies: 'insuranceCompaniesView',
                concepts: 'insuranceConceptsView',
                notes: 'insuranceNotesView',
                ai: 'insuranceAiView'
            };

            const targetId = viewMap[viewName] || viewMap.home;
            const views = document.querySelectorAll('#insuranceContainer .insurance-view');
            views.forEach(view => view.classList.remove('active'));

            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');

            if (viewName === 'provisions') {
                openInsuranceActsScreen();
            }

            if (viewName === 'companies') {
                showInsuranceHandbookCategories();
            }

            if (viewName === 'ai') {
                setTimeout(() => {
                    const input = document.getElementById('insuranceChatInput');
                    if (input) input.focus();
                }, 50);
            }
        }

        function openInsuranceActsScreen() {
            insuranceActiveActId = null;
            const actsScreen = document.getElementById('insuranceActsScreen');
            const provisionsScreen = document.getElementById('insuranceActProvisionsScreen');
            if (actsScreen) actsScreen.classList.add('active');
            if (provisionsScreen) provisionsScreen.classList.remove('active');
            renderInsuranceActs();
        }

        function openInsuranceActProvisions(actId) {
            insuranceActiveActId = actId;
            const actsScreen = document.getElementById('insuranceActsScreen');
            const provisionsScreen = document.getElementById('insuranceActProvisionsScreen');
            if (actsScreen) actsScreen.classList.remove('active');
            if (provisionsScreen) provisionsScreen.classList.add('active');
            renderInsuranceActProvisions();
        }

        function renderInsuranceActs() {
            const listEl = document.getElementById('insuranceActsList');
            if (!listEl) return;

            if (!insuranceActs.length) {
                listEl.innerHTML = '<div class="insurance-empty-state">No acts added yet. Click + Add Act to start.</div>';
                return;
            }

            listEl.innerHTML = insuranceActs.map(act => {
                const yearText = act.year ? `Year: ${escapeInsuranceHtml(act.year)}` : 'Year: â€”';
                return `
                    <div class="insurance-card" onclick="openInsuranceActProvisions('${escapeInsuranceHtml(act.actId)}')">
                        <div class="insurance-card-icon">ðŸ“˜</div>
                        <h3 class="insurance-card-title">${escapeInsuranceHtml(act.actName)}</h3>
                        <p class="insurance-act-meta">${yearText}</p>
                        <p class="insurance-card-desc">${escapeInsuranceHtml(act.description || 'No description')}</p>
                        <div class="insurance-provision-actions">
                            <button class="submit-btn btn-sm btn-muted" onclick="event.stopPropagation();openInsuranceActProvisions('${escapeInsuranceHtml(act.actId)}')">Open</button>
                            <button class="submit-btn btn-sm" onclick="event.stopPropagation();editInsuranceAct('${escapeInsuranceHtml(act.actId)}')">Edit</button>
                            <button class="submit-btn btn-sm btn-danger" onclick="event.stopPropagation();deleteInsuranceAct('${escapeInsuranceHtml(act.actId)}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderInsuranceActProvisions() {
            const activeAct = getInsuranceActiveAct();
            const titleEl = document.getElementById('insuranceActiveActTitle');
            const descEl = document.getElementById('insuranceActiveActDescription');
            const listEl = document.getElementById('insuranceActProvisionsList');

            if (!titleEl || !descEl || !listEl) return;
            if (!activeAct) {
                titleEl.textContent = 'Act';
                descEl.textContent = '';
                listEl.innerHTML = '';
                return;
            }

            titleEl.textContent = activeAct.year ? `${activeAct.actName} ${activeAct.year}` : activeAct.actName;
            descEl.textContent = activeAct.description || '';

            const provisions = getInsuranceProvisionsForAct(activeAct.actId);
            if (!provisions.length) {
                listEl.innerHTML = '<div class="insurance-empty-state">No provisions added for this act. Click + Add Provision.</div>';
                return;
            }

            listEl.innerHTML = provisions.map(item => `
                <div class="insurance-data-card insurance-provision-card">
                    <p class="insurance-data-muted" style="font-weight:700;color:#16a34a;margin-bottom:0.3rem;">${escapeInsuranceHtml(item.sectionNumber)}</p>
                    <h3 class="insurance-card-title" style="margin-bottom:0.45rem;">${escapeInsuranceHtml(item.sectionTitle)}</h3>
                    <div class="insurance-tags">
                        ${(item.tags || []).map(tag => `<span class="insurance-tag">${escapeInsuranceHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="insurance-provision-actions">
                        <button class="submit-btn btn-sm btn-muted" onclick="viewInsuranceProvisionDetails('${escapeInsuranceHtml(item.provisionId)}')">View</button>
                        <button class="submit-btn btn-sm" onclick="editInsuranceProvision('${escapeInsuranceHtml(item.provisionId)}')">Edit</button>
                        <button class="submit-btn btn-sm btn-danger" onclick="deleteInsuranceProvision('${escapeInsuranceHtml(item.provisionId)}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        function viewInsuranceProvisionDetails(provisionId) {
            const item = insuranceProvisions.find(provision => provision.provisionId === provisionId);
            if (!item) return;

            const tagsHtml = (item.tags || []).map(tag => `<span class="insurance-tag">${escapeInsuranceHtml(tag)}</span>`).join('');
            const relatedHtml = (item.relatedSections || []).map(section => `<span class="insurance-tag">${escapeInsuranceHtml(section)}</span>`).join('');
            const content = `
                <div class="insurance-detail-grid">
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Section Number</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.sectionNumber)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Section Title</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.sectionTitle)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Section Text</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.sectionText)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Plain Explanation</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.plainExplanation)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Purpose of Section</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.purposeOfSection)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Supervisory Focus Areas</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.supervisoryFocusAreas)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Practical Examples</h3>
                        <p class="insurance-data-muted">${escapeInsuranceHtml(item.practicalExamples)}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Tags</h3>
                        <div class="insurance-tags">${tagsHtml || '<span class="insurance-data-muted">â€”</span>'}</div>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.4rem 0;color:#0f2540;">Related Sections</h3>
                        <div class="insurance-tags">${relatedHtml || '<span class="insurance-data-muted">â€”</span>'}</div>
                    </div>
                </div>
            `;
            openInsuranceDetailModal(`${item.sectionNumber} â€” ${item.sectionTitle}`, content);
        }

        function openInsuranceAddActModal(actId = null) {
            insuranceActEditId = actId;
            const modal = document.getElementById('insuranceAddActModal');
            const titleEl = document.getElementById('insuranceActFormTitle');
            const saveBtn = document.getElementById('insuranceActSaveBtn');
            if (!modal) return;

            const targetAct = insuranceActs.find(act => act.actId === insuranceActEditId);
            const isEdit = !!targetAct;

            if (titleEl) titleEl.textContent = isEdit ? 'Edit Act' : 'Add Act';
            if (saveBtn) saveBtn.textContent = isEdit ? 'Update Act' : 'Save Act';

            document.getElementById('insuranceNewActName').value = targetAct?.actName || '';
            document.getElementById('insuranceNewActYear').value = targetAct?.year || '';
            document.getElementById('insuranceNewActDescription').value = targetAct?.description || '';

            const modalBox = modal.querySelector('.insurance-modal-box');
            if (modalBox) modalBox.scrollTop = 0;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeInsuranceAddActModal() {
            const modal = document.getElementById('insuranceAddActModal');
            if (modal) modal.classList.remove('active');
            insuranceActEditId = null;
            document.body.style.overflow = 'auto';
        }

        async function saveInsuranceAct() {
            const actName = document.getElementById('insuranceNewActName')?.value.trim() || '';
            const year = document.getElementById('insuranceNewActYear')?.value.trim() || '';
            const description = document.getElementById('insuranceNewActDescription')?.value.trim() || '';

            if (!actName) {
                alert('Please enter Act Name.');
                return;
            }

            try {
                if (insuranceActEditId) {
                    await window.firebaseUpdateInsuranceAct(insuranceActEditId, {
                        actName,
                        year,
                        description
                    });
                } else {
                    await window.firebaseCreateInsuranceAct({
                        actName,
                        year,
                        description
                    });
                }

                await window.firebaseLoadInsuranceActsAndProvisions();
                renderInsuranceActs();
                if (insuranceActiveActId && insuranceActEditId && insuranceActiveActId === insuranceActEditId) {
                    renderInsuranceActProvisions();
                }
            } catch (error) {
                alert('Error saving act: ' + error.message);
                console.error(error);
                return;
            }

            closeInsuranceAddActModal();
            document.getElementById('insuranceNewActName').value = '';
            document.getElementById('insuranceNewActYear').value = '';
            document.getElementById('insuranceNewActDescription').value = '';
        }

        function editInsuranceAct(actId) {
            openInsuranceAddActModal(actId);
        }

        async function deleteInsuranceAct(actId) {
            const targetAct = insuranceActs.find(act => act.actId === actId);
            if (!targetAct) return;

            const relatedCount = getInsuranceProvisionsForAct(actId).length;
            const confirmationText = relatedCount
                ? `Delete act ${targetAct.actName}${targetAct.year ? ` ${targetAct.year}` : ''}? This will also delete ${relatedCount} provision(s).`
                : `Delete act ${targetAct.actName}${targetAct.year ? ` ${targetAct.year}` : ''}?`;

            if (!confirm(confirmationText)) return;

            try {
                await window.firebaseDeleteInsuranceActAndProvisions(actId);
                await window.firebaseLoadInsuranceActsAndProvisions();
            } catch (error) {
                alert('Error deleting act: ' + error.message);
                console.error(error);
                return;
            }

            if (insuranceActiveActId === actId) {
                openInsuranceActsScreen();
            } else {
                renderInsuranceActs();
            }

            closeInsuranceDetailModal();
        }

        function editInsuranceProvision(provisionId) {
            openInsuranceProvisionFormModal(provisionId);
        }

        async function deleteInsuranceProvision(provisionId) {
            const targetProvision = insuranceProvisions.find(item => item.provisionId === provisionId);
            if (!targetProvision) return;

            const confirmed = confirm(`Delete provision ${targetProvision.sectionNumber} â€” ${targetProvision.sectionTitle}?`);
            if (!confirmed) return;

            try {
                await window.firebaseDeleteInsuranceProvision(provisionId);
                await window.firebaseLoadInsuranceActsAndProvisions();
            } catch (error) {
                alert('Error deleting provision: ' + error.message);
                console.error(error);
                return;
            }

            renderInsuranceActProvisions();
            closeInsuranceDetailModal();
        }

        function formatInsurerDate(value) {
            if (!value) return 'â€”';

            if (typeof value === 'string') {
                return value;
            }

            if (value && typeof value.toDate === 'function') {
                return value.toDate().toLocaleDateString('en-GB');
            }

            if (value && typeof value.seconds === 'number') {
                return new Date(value.seconds * 1000).toLocaleDateString('en-GB');
            }

            return String(value);
        }

        function normalizePremiumData(premiumData) {
            if (!premiumData || (typeof premiumData !== 'object' && !Array.isArray(premiumData))) {
                return [];
            }

            const parseYear = (rawYear) => {
                const yearMatch = String(rawYear || '').match(/(19|20)\d{2}/);
                if (!yearMatch) return null;
                const yearValue = Number(yearMatch[0]);
                return Number.isFinite(yearValue) ? yearValue : null;
            };

            const parseNumericValue = (rawValue) => {
                const directNumber = Number(rawValue);
                if (Number.isFinite(directNumber)) {
                    return directNumber;
                }

                if (rawValue && typeof rawValue === 'object') {
                    const candidateKeys = ['value', 'premium', 'gdp', 'amount', 'total'];
                    for (const key of candidateKeys) {
                        const numeric = Number(rawValue[key]);
                        if (Number.isFinite(numeric)) {
                            return numeric;
                        }
                    }
                }

                return 0;
            };

            const yearValueMap = {};

            if (Array.isArray(premiumData)) {
                premiumData.forEach(item => {
                    if (!item || typeof item !== 'object') return;
                    const parsedYear = parseYear(item.year || item.fy || item.label || '');
                    if (!parsedYear) return;
                    yearValueMap[parsedYear] = parseNumericValue(item);
                });
            } else {
                Object.entries(premiumData).forEach(([key, value]) => {
                    let parsedYear = parseYear(key);

                    if (!parsedYear && value && typeof value === 'object') {
                        parsedYear = parseYear(value.year || value.fy || value.label || '');
                    }

                    if (!parsedYear) return;
                    yearValueMap[parsedYear] = parseNumericValue(value);
                });
            }

            const yearKeys = Object.keys(yearValueMap)
                .map(key => Number(key))
                .sort((a, b) => a - b);

            if (!yearKeys.length) {
                return [];
            }

            const startYear = yearKeys[0];
            const endYear = yearKeys[yearKeys.length - 1];
            const rows = [];

            for (let year = startYear; year <= endYear; year += 1) {
                const rawValue = yearValueMap[year] ?? 0;
                const numericValue = Number(rawValue);
                rows.push({
                    year,
                    premium: Number.isFinite(numericValue) ? numericValue : 0
                });
            }

            return rows;
        }

        function formatPremiumValue(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return '0.00';
            return numeric.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function resetTimelineState() {
            selectedTimeline = 'all_years';
            currentMetricRows = [];
            currentMetricLabel = '';
            currentMetricType = '';
        }

        function rowsToSeriesMap(rows = []) {
            const result = {};
            rows.forEach(row => {
                if (!row || !Number.isFinite(Number(row.year))) return;
                result[String(row.year)] = Number(row.premium) || 0;
            });
            return result;
        }

        function showTimelineControl() {
            const timelineWrapEl = document.getElementById('insuranceTimelineControl');
            if (!timelineWrapEl) return;
            timelineWrapEl.classList.add('show');
            timelineWrapEl.setAttribute('aria-hidden', 'false');
        }

        function hideTimelineControl() {
            const timelineWrapEl = document.getElementById('insuranceTimelineControl');
            const timelineSelectEl = document.getElementById('insuranceTimelineSelect');
            if (timelineWrapEl) {
                timelineWrapEl.classList.remove('show');
                timelineWrapEl.setAttribute('aria-hidden', 'true');
            }
            if (timelineSelectEl) {
                timelineSelectEl.innerHTML = '<option value="all_years">All Years</option>';
                timelineSelectEl.value = 'all_years';
                timelineSelectEl.disabled = true;
            }
            selectedTimeline = 'all_years';
        }

        function populateTimelineDropdown(years) {
            const timelineSelectEl = document.getElementById('insuranceTimelineSelect');
            if (!timelineSelectEl) return;

            const uniqueYearsDesc = Array.from(new Set((years || [])
                .map(year => Number(year))
                .filter(year => Number.isFinite(year))
            )).sort((a, b) => b - a);

            const previousSelection = selectedTimeline;

            const options = [
                '<option value="all_years">All Years</option>',
                '<option value="last_5_years">Last 5 Years</option>',
                '<option value="last_3_years">Last 3 Years</option>',
                '<option value="separator" disabled>────────────</option>',
                ...uniqueYearsDesc.map(year => `<option value="year_${year}">${year}</option>`)
            ];

            timelineSelectEl.innerHTML = options.join('');
            timelineSelectEl.disabled = uniqueYearsDesc.length === 0;

            const availableValues = new Set(['all_years', 'last_5_years', 'last_3_years', ...uniqueYearsDesc.map(year => `year_${year}`)]);
            selectedTimeline = availableValues.has(previousSelection) ? previousSelection : 'all_years';
            timelineSelectEl.value = selectedTimeline;
        }

        function applyTimelineFilter(data, selection) {
            const rows = (data || []).slice().sort((a, b) => Number(a.year) - Number(b.year));
            if (!rows.length) return [];

            const choice = String(selection || 'all_years').toLowerCase();
            if (choice === 'all_years') {
                return rows;
            }

            const maxYear = Math.max(...rows.map(row => Number(row.year)));

            if (choice === 'last_5_years') {
                const minYear = maxYear - 4;
                return rows.filter(row => Number(row.year) >= minYear);
            }

            if (choice === 'last_3_years') {
                const minYear = maxYear - 2;
                return rows.filter(row => Number(row.year) >= minYear);
            }

            const yearMatch = choice.match(/^year_(\d{4})$/);
            if (yearMatch) {
                const targetYear = Number(yearMatch[1]);
                return rows.filter(row => Number(row.year) === targetYear);
            }

            return rows;
        }

        function updateUI(filteredData) {
            const rows = (filteredData || []).slice().sort((a, b) => Number(a.year) - Number(b.year));
            if (!rows.length) {
                renderLeftPanelHtml('<p class="insurance-data-muted">No data available for the selected timeline.</p>');
                showPlaceholder('No trend data available for the selected timeline');
                return;
            }

            const seriesMap = rowsToSeriesMap(rows);
            if (currentMetricType === 'segment_gdp') {
                renderSegmentTable(seriesMap, selectedSegment);
                renderSegmentChart(seriesMap, selectedSegment);
                return;
            }

            renderPremiumTable(seriesMap, currentMetricLabel || 'Metric');
            renderPremiumChart(seriesMap, currentMetricLabel || 'Metric');
        }

        function refreshMetricPanels(metricRows, metricLabel, metricType) {
            const rows = (metricRows || []).slice().sort((a, b) => Number(a.year) - Number(b.year));
            currentMetricRows = rows;
            currentMetricLabel = metricLabel || 'Metric';
            currentMetricType = metricType || 'metric';

            if (!rows.length) {
                hideTimelineControl();
                return;
            }

            showTimelineControl();
            populateTimelineDropdown(rows.map(row => row.year));
            const filteredRows = applyTimelineFilter(rows, selectedTimeline);
            updateUI(filteredRows);
        }

        function onTimelineChange(selection) {
            selectedTimeline = String(selection || 'all_years');
            if (!currentMetricRows.length) {
                return;
            }
            const filteredRows = applyTimelineFilter(currentMetricRows, selectedTimeline);
            updateUI(filteredRows);
        }

        function renderLeftPanelHtml(contentHtml) {
            const panelEl = document.getElementById('insuranceLeftPanelContent');
            if (!panelEl) return;
            panelEl.innerHTML = contentHtml;
        }

        function getPremiumInfoMeta(infoType = '') {
            const normalizedType = String(infoType || '').toLowerCase();
            if (normalizedType === 'gross_direct_premium') {
                return {
                    field: 'gross_direct_premium',
                    label: 'Gross Direct Premium'
                };
            }
            return {
                field: 'total_premium',
                label: 'Total Premium'
            };
        }

        function formatSegmentLabel(segment) {
            return String(segment || '')
                .split('_')
                .filter(Boolean)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
        }

        function normalizeSegmentKey(key) {
            return String(key || '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '');
        }

        function extractSegmentSeries(segmentValue) {
            if (!segmentValue) return {};
            if (Array.isArray(segmentValue)) return segmentValue;
            if (typeof segmentValue !== 'object') return {};

            const directYearKeys = Object.keys(segmentValue).some(key => /(19|20)\d{2}/.test(String(key)));
            if (directYearKeys) return segmentValue;

            const nestedCandidates = ['series', 'data', 'values', 'gdp', 'premium'];
            for (const candidate of nestedCandidates) {
                const nested = segmentValue[candidate];
                if (!nested) continue;
                if (Array.isArray(nested)) return nested;
                if (typeof nested === 'object') return nested;
            }

            return segmentValue;
        }

        function resolveSegmentGDPData(segmentGDPMap, requestedSegment) {
            if (!segmentGDPMap || typeof segmentGDPMap !== 'object') {
                return {};
            }

            if (segmentGDPMap[requestedSegment]) {
                return extractSegmentSeries(segmentGDPMap[requestedSegment]);
            }

            const targetKey = normalizeSegmentKey(requestedSegment);
            const matchingEntry = Object.entries(segmentGDPMap).find(([key]) => normalizeSegmentKey(key) === targetKey);
            if (matchingEntry) {
                return extractSegmentSeries(matchingEntry[1]);
            }

            return {};
        }

        function getInfoTypeOptionsForCategory(category = insuranceHandbookCategory) {
            const normalizedCategory = String(category || '').toLowerCase();
            if (normalizedCategory === 'general') {
                return [
                    { value: 'basic', label: 'Basic Info' },
                    { value: 'gross_direct_premium', label: 'Gross Direct Premium' },
                    { value: 'segment_gdp', label: 'Segment GDP' }
                ];
            }

            return [
                { value: 'basic', label: 'Basic Info' },
                { value: 'total_premium', label: 'Total Premium' }
            ];
        }

        function getDefaultPremiumInfoTypeForCategory(category = insuranceHandbookCategory) {
            const normalizedCategory = String(category || '').toLowerCase();
            return normalizedCategory === 'general' ? 'gross_direct_premium' : 'total_premium';
        }

        function showSegmentDropdown() {
            const segmentCardEl = document.getElementById('insuranceSegmentControlCard');
            const segmentSelectEl = document.getElementById('insuranceSegmentSelect');
            if (!segmentCardEl || !segmentSelectEl) return;

            segmentCardEl.classList.add('show');
            segmentCardEl.setAttribute('aria-hidden', 'false');
            segmentSelectEl.disabled = !selectedInsurer;
            segmentSelectEl.value = selectedSegment || '';
        }

        function hideSegmentDropdown() {
            const segmentCardEl = document.getElementById('insuranceSegmentControlCard');
            const segmentSelectEl = document.getElementById('insuranceSegmentSelect');
            if (!segmentCardEl || !segmentSelectEl) return;

            segmentCardEl.classList.remove('show');
            segmentCardEl.setAttribute('aria-hidden', 'true');
            segmentSelectEl.value = '';
            segmentSelectEl.disabled = true;
            selectedSegment = '';
        }

        function refreshInsuranceInfoTypeOptions() {
            const infoTypeSelectEl = document.getElementById('insuranceInfoTypeSelect');
            if (!infoTypeSelectEl) return;

            const options = getInfoTypeOptionsForCategory();

            infoTypeSelectEl.innerHTML = [
                '<option value="">Choose information type</option>',
                ...options.map(item => `<option value="${item.value}">${item.label}</option>`)
            ].join('');
            infoTypeSelectEl.value = '';
            infoTypeSelectEl.disabled = true;
            selectedInfoType = '';
            hideSegmentDropdown();
        }

        function showSection(sectionName) {
            const section = String(sectionName || '').toLowerCase();
            if (section === 'basic') {
                resetTimelineState();
                hideTimelineControl();
                if (currentInsurerData) {
                    renderBasicInfo(currentInsurerData);
                } else {
                    renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer to view analytics.</p>');
                }
                const normalizedCategory = String(insuranceHandbookCategory || '').toLowerCase();
                const premiumPrompt = normalizedCategory === 'general'
                    ? 'Select Gross Direct Premium or Segment GDP to view trend chart'
                    : 'Select Total Premium to view trend chart';
                showPlaceholder(premiumPrompt);
                return;
            }

            if (section === 'total_premium' || section === 'gross_direct_premium') {
                const premiumMeta = getPremiumInfoMeta(section);
                if (currentInsurerData) {
                    const premiumData = currentInsurerData[premiumMeta.field] || {};
                    const premiumRows = normalizePremiumData(premiumData);
                    if (!premiumRows.length) {
                        resetTimelineState();
                        hideTimelineControl();
                        renderLeftPanelHtml('<p class="insurance-data-muted">No premium data available for this insurer.</p>');
                        showPlaceholder('No premium trend data available for this insurer.');
                        return;
                    }
                    refreshMetricPanels(premiumRows, premiumMeta.label, section);
                } else {
                    resetTimelineState();
                    hideTimelineControl();
                    renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer to view analytics.</p>');
                    showPlaceholder('Select an insurer to view analytics');
                }
                return;
            }

            if (section === 'segment_gdp') {
                showSegmentDropdown();
                if (!selectedInsurer) {
                    resetTimelineState();
                    hideTimelineControl();
                    renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer first to view Segment GDP.</p>');
                    showPlaceholder('Select an insurer first to view Segment GDP trend');
                    return;
                }

                if (!selectedSegment) {
                    resetTimelineState();
                    hideTimelineControl();
                    renderLeftPanelHtml('<p class="insurance-data-muted">Select a segment to view Segment GDP data.</p>');
                    showPlaceholder('Select Segment to view trend chart');
                    return;
                }

                loadSegmentGDP();
                return;
            }

            resetTimelineState();
            hideTimelineControl();
            renderLeftPanelHtml('<p class="insurance-data-muted">Select information type to view data.</p>');
            showPlaceholder('Select information type to view visualization');
        }

        async function onInsurerChange(regNo) {
            const infoTypeSelectEl = document.getElementById('insuranceInfoTypeSelect');
            const segmentSelectEl = document.getElementById('insuranceSegmentSelect');

            selectedInsurer = String(regNo || '');
            selectedSegment = '';

            if (segmentSelectEl) {
                segmentSelectEl.value = '';
                segmentSelectEl.disabled = !selectedInsurer;
            }

            if (infoTypeSelectEl) {
                infoTypeSelectEl.value = '';
                infoTypeSelectEl.disabled = !regNo;
            }

            selectedInfoType = '';
            resetTimelineState();
            hideTimelineControl();

            if (!regNo) {
                currentInsurerData = null;
                renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer to view analytics.</p>');
                showPlaceholder('Select an insurer to view analytics');
                return;
            }

            renderLeftPanelHtml('<p class="insurance-data-muted">Loading insurer details...</p>');
            showPlaceholder('Select information type to view visualization');
            await loadInsurerData(regNo);

            if (!currentInsurerData) {
                renderBasicInfo({ __error: 'Unable to load insurer details. Please try again.' });
                showPlaceholder('Select an insurer to view analytics');
                return;
            }

            renderLeftPanelHtml('<p class="insurance-data-muted">Select information type to view data.</p>');
        }

        function onInfoTypeChange() {
            const infoTypeSelectEl = document.getElementById('insuranceInfoTypeSelect');
            const infoTypeValue = infoTypeSelectEl?.value || '';
            selectedInfoType = infoTypeValue;

            if (!infoTypeValue) {
                hideSegmentDropdown();
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml('<p class="insurance-data-muted">Select information type to view data.</p>');
                showPlaceholder('Select information type to view visualization');
                return;
            }

            if (infoTypeValue === 'segment_gdp') {
                showSection(infoTypeValue);
                return;
            }

            hideSegmentDropdown();

            showSection(infoTypeValue);
        }

        function showPlaceholder(message = 'Select an insurer to view analytics') {
            const canvas = document.getElementById('insurancePremiumChartCanvas');
            const messageEl = document.getElementById('insurancePremiumChartMessage');

            if (insurerPremiumChart) {
                insurerPremiumChart.destroy();
                insurerPremiumChart = null;
            }

            if (messageEl) messageEl.textContent = message;
            if (canvas) canvas.style.display = 'none';
        }

        function renderBasicInfo(data) {
            if (!data) {
                renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer to view analytics.</p>');
                return;
            }

            if (data.__loading) {
                renderLeftPanelHtml('<p class="insurance-data-muted">Loading insurer details...</p>');
                return;
            }

            if (data.__empty) {
                renderLeftPanelHtml('<p class="insurance-data-muted">No insurers are available in the master collection.</p>');
                return;
            }

            if (data.__error) {
                renderLeftPanelHtml(`<p class="insurance-data-muted">${escapeInsuranceHtml(data.__error)}</p>`);
                return;
            }

            renderLeftPanelHtml(`
                <h3 class="insurance-premium-title">Basic Information</h3>
                <table class="insurance-data-table insurance-insurer-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Insurer Name</td>
                            <td>${escapeInsuranceHtml(data.insurer_name)}</td>
                        </tr>
                        <tr>
                            <td>Registration Number</td>
                            <td>${escapeInsuranceHtml(data.reg_no)}</td>
                        </tr>
                        <tr>
                            <td>Sector</td>
                            <td>${escapeInsuranceHtml(data.sector)}</td>
                        </tr>
                        <tr>
                            <td>Category</td>
                            <td>${escapeInsuranceHtml(data.category)}</td>
                        </tr>
                        <tr>
                            <td>Date of Registration</td>
                            <td>${escapeInsuranceHtml(data.date_of_registration)}</td>
                        </tr>
                        <tr>
                            <td>Foreign Partners</td>
                            <td>${escapeInsuranceHtml(data.foreign_partners)}</td>
                        </tr>
                    </tbody>
                </table>
            `);
        }

        function renderPremiumTable(premiumData, premiumLabel = 'Total Premium') {
            const rows = normalizePremiumData(premiumData);
            if (!rows.length) {
                renderLeftPanelHtml('<p class="insurance-data-muted">No premium data available for this insurer.</p>');
                return;
            }

            renderLeftPanelHtml(`
                <h3 class="insurance-premium-title">${escapeInsuranceHtml(premiumLabel)} (₹ Crore)</h3>
                <table class="insurance-data-table insurance-premium-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>${escapeInsuranceHtml(premiumLabel)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                <td>${row.year}</td>
                                <td>₹ ${formatPremiumValue(row.premium)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `);
        }

        function renderPremiumChart(premiumData, premiumLabel = 'Total Premium') {
            const canvas = document.getElementById('insurancePremiumChartCanvas');
            const messageEl = document.getElementById('insurancePremiumChartMessage');
            if (!canvas) return;

            if (insurerPremiumChart) {
                insurerPremiumChart.destroy();
                insurerPremiumChart = null;
            }

            const rows = normalizePremiumData(premiumData);
            if (!rows.length) {
                showPlaceholder('No premium trend data available for this insurer.');
                return;
            }

            if (typeof window.Chart !== 'function') {
                showPlaceholder('Chart library is not available.');
                return;
            }

            if (messageEl) messageEl.textContent = '';
            canvas.style.display = 'block';

            const labels = rows.map(row => String(row.year));
            const values = rows.map(row => row.premium);

            insurerPremiumChart = new window.Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: `${premiumLabel} (₹ Crore)`,
                        data: values,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        tension: 0.35,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: context => `₹ ${formatPremiumValue(context.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years'
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.18)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Premium'
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.18)'
                            },
                            ticks: {
                                callback: value => `₹ ${Number(value).toLocaleString('en-IN')}`
                            }
                        }
                    }
                }
            });
        }

        function renderSegmentTable(segmentData, segmentKey) {
            const segmentLabel = formatSegmentLabel(segmentKey);
            renderPremiumTable(segmentData, `Segment GDP - ${segmentLabel}`);
        }

        function renderSegmentChart(segmentData, segmentKey) {
            const segmentLabel = formatSegmentLabel(segmentKey);
            renderPremiumChart(segmentData, `Segment GDP - ${segmentLabel}`);
        }

        async function loadSegmentGDP() {
            if (!selectedInsurer || !selectedSegment) {
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml('<p class="insurance-data-muted">Select insurer and segment to view Segment GDP data.</p>');
                showPlaceholder('Select insurer and segment to view trend chart');
                return;
            }

            if (!segmentOptions.includes(selectedSegment)) {
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml('<p class="insurance-data-muted">Invalid segment selected.</p>');
                showPlaceholder('Select a valid segment');
                return;
            }

            if (!currentInsurerData || String(currentInsurerData.reg_no || '') !== selectedInsurer) {
                await loadInsurerData(selectedInsurer);
            }

            if (!currentInsurerData) {
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml('<p class="insurance-data-muted">Unable to load insurer details. Please try again.</p>');
                showPlaceholder('Unable to load Segment GDP trend');
                return;
            }

            const segmentGDPMap = currentInsurerData.segment_gdp || {};
            const segmentData = resolveSegmentGDPData(segmentGDPMap, selectedSegment);
            const segmentRows = normalizePremiumData(segmentData);

            if (!segmentRows.length) {
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml(`<p class="insurance-data-muted">No Segment GDP data available for ${escapeInsuranceHtml(formatSegmentLabel(selectedSegment))}.</p>`);
                showPlaceholder(`No Segment GDP trend available for ${formatSegmentLabel(selectedSegment)}`);
                return;
            }

            refreshMetricPanels(segmentRows, `Segment GDP - ${formatSegmentLabel(selectedSegment)}`, 'segment_gdp');
        }

        function onSegmentChange(segment) {
            selectedSegment = String(segment || '').toLowerCase();

            if (!selectedSegment) {
                resetTimelineState();
                hideTimelineControl();
                renderLeftPanelHtml('<p class="insurance-data-muted">Select a segment to view Segment GDP data.</p>');
                showPlaceholder('Select Segment to view trend chart');
                return;
            }

            if (selectedInfoType !== 'segment_gdp') {
                return;
            }

            loadSegmentGDP();
        }

        async function loadInsurersDropdown() {
            const dropdownEl = document.getElementById('insuranceInsurerSelect');
            const infoTypeSelectEl = document.getElementById('insuranceInfoTypeSelect');
            const segmentSelectEl = document.getElementById('insuranceSegmentSelect');
            const collectionName = getInsurerMasterCollectionForCategory();
            if (!dropdownEl) return;

            currentInsurerData = null;
            selectedInsurer = '';
            selectedInfoType = '';
            selectedSegment = '';
            resetTimelineState();
            if (infoTypeSelectEl) {
                infoTypeSelectEl.value = '';
                infoTypeSelectEl.disabled = true;
            }
            if (segmentSelectEl) {
                segmentSelectEl.value = '';
                segmentSelectEl.disabled = true;
            }
            hideSegmentDropdown();
            hideTimelineControl();
            renderLeftPanelHtml('<p class="insurance-data-muted">Select an insurer to view analytics.</p>');
            showPlaceholder('Select an insurer to view analytics');

            if (!window.db || !window.collection || !window.getDocs) {
                dropdownEl.innerHTML = '<option value="">Unable to load insurers</option>';
                dropdownEl.disabled = true;
                renderBasicInfo({ __error: 'Firestore is not available right now.' });
                return;
            }

            if (insurersDropdownLoaded && loadedInsurerCollection === collectionName && dropdownEl.options.length > 1) {
                return;
            }

            dropdownEl.disabled = true;
            dropdownEl.innerHTML = '<option value="">Loading insurers...</option>';
            renderLeftPanelHtml('<p class="insurance-data-muted">Loading insurers...</p>');
            showPlaceholder('Select an insurer to view analytics');

            try {
                const snapshot = await window.getDocs(window.collection(window.db, collectionName));
                const insurers = [];

                snapshot.forEach(docSnap => {
                    const row = docSnap.data() || {};
                    insurers.push({
                        reg_no: docSnap.id,
                        insurer_name: row.insurer_name || '',
                        sector: row.sector || '',
                        category: row.category || '',
                        date_of_registration: row.date_of_registration || ''
                    });
                });

                insurers.sort((a, b) => String(a.insurer_name || '').localeCompare(String(b.insurer_name || '')));

                if (!insurers.length) {
                    dropdownEl.innerHTML = '<option value="">No insurers found</option>';
                    dropdownEl.disabled = true;
                    renderBasicInfo({ __empty: true });
                    showPlaceholder('Select an insurer to view analytics');
                    insurersDropdownLoaded = true;
                    loadedInsurerCollection = collectionName;
                    return;
                }

                dropdownEl.innerHTML = [
                    '<option value="">Select an insurer to view details</option>',
                    ...insurers.map(item => `<option value="${escapeInsuranceHtml(item.reg_no)}">${escapeInsuranceHtml(item.insurer_name || item.reg_no)}</option>`)
                ].join('');
                dropdownEl.disabled = false;
                insurersDropdownLoaded = true;
                loadedInsurerCollection = collectionName;
            } catch (error) {
                console.error('Error loading insurers dropdown:', error?.code || error?.message || error);
                const errorCode = String(error?.code || '').toLowerCase();
                let userMessage = 'Unable to load insurer list. Please try again.';

                if (errorCode.includes('permission-denied')) {
                    userMessage = 'Unable to load insurer list. Firestore permission denied for insurers_master read/list.';
                } else if (errorCode.includes('unavailable')) {
                    userMessage = 'Unable to load insurer list. Firestore service is temporarily unavailable.';
                }

                dropdownEl.innerHTML = '<option value="">Failed to load insurers</option>';
                dropdownEl.disabled = true;
                renderBasicInfo({ __error: userMessage });
                showPlaceholder('Select an insurer to view analytics');
                loadedInsurerCollection = '';
            }
        }

        async function loadInsurerData(regNo) {
            if (!regNo) {
                currentInsurerData = null;
                return;
            }

            const collectionName = getInsurerMasterCollectionForCategory();

            if (!window.db || !window.doc || !window.getDoc) {
                currentInsurerData = null;
                return;
            }

            try {
                const docRef = window.doc(window.db, collectionName, regNo);
                const docSnap = await window.getDoc(docRef);

                if (!docSnap.exists()) {
                    currentInsurerData = null;
                    return;
                }

                const row = docSnap.data() || {};

                currentInsurerData = {
                    insurer_name: row.insurer_name || 'â€”',
                    reg_no: row.reg_no || docSnap.id,
                    sector: row.sector || 'â€”',
                    category: row.category || 'â€”',
                    date_of_registration: formatInsurerDate(row.date_of_registration),
                    foreign_partners: row.foreign_partners || 'â€”',
                    total_premium: row.total_premium || {},
                    gross_direct_premium: row.gross_direct_premium || {},
                    segment_gdp: row.segment_gdp || {},
                };
            } catch (error) {
                console.error('Error loading insurer data:', error);
                currentInsurerData = null;
            }
        }

        async function fetchInsurerDetails(regNo) {
            await loadInsurerData(regNo);
        }

        function renderInsurerDetails(data) {
            renderBasicInfo(data);
        }

        function renderInsuranceCompanies() {
            const listEl = document.getElementById('insuranceCompaniesList');
            if (!listEl) return;

            if (!insuranceCompanies.length) {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                return;
            }

            listEl.style.display = 'grid';

            listEl.innerHTML = insuranceCompanies.map((company, index) => `
                <div class="insurance-data-card" onclick="openInsuranceCompanyDetail(${index})">
                    <h3 class="insurance-card-title" style="margin-bottom:0.5rem;">${company.name}</h3>
                    <p class="insurance-data-muted"><strong>Type:</strong> ${company.type}</p>
                    <p class="insurance-data-muted"><strong>Solvency Ratio:</strong> ${company.solvencyRatio}</p>
                    <p class="insurance-card-desc" style="margin-top:0.55rem;">${company.notesPreview}</p>
                </div>
            `).join('');
        }

        function openInsuranceCompanyDetail(index) {
            const company = insuranceCompanies[index];
            if (!company) return;
            const content = `
                <div class="insurance-detail-grid">
                    <div>
                        <h3 style="margin:0 0 0.35rem 0;color:#0f2540;">Company Name</h3>
                        <p class="insurance-data-muted">${company.name}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.35rem 0;color:#0f2540;">Type</h3>
                        <p class="insurance-data-muted">${company.type}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.35rem 0;color:#0f2540;">Solvency Ratio</h3>
                        <p class="insurance-data-muted">${company.solvencyRatio}</p>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.35rem 0;color:#0f2540;">Notes</h3>
                        <p class="insurance-data-muted">${company.details}</p>
                    </div>
                </div>
            `;
            openInsuranceDetailModal(company.name, content);
        }

        function renderInsuranceConcepts() {
            const listEl = document.getElementById('insuranceConceptsList');
            if (!listEl) return;

            listEl.innerHTML = insuranceConcepts.map(concept => `
                <div class="insurance-data-card">
                    <h3 class="insurance-card-title" style="margin-bottom:0.45rem;">${concept.name}</h3>
                    <p class="insurance-card-desc" style="margin-bottom:0.45rem;"><strong>Simple Explanation:</strong> ${concept.explanation}</p>
                    <p class="insurance-data-muted"><strong>Insurance Relevance:</strong> ${concept.relevance}</p>
                </div>
            `).join('');
        }

        function renderInsuranceNotes() {
            const listEl = document.getElementById('insuranceNotesList');
            if (!listEl) return;

            if (!insuranceNotes.length) {
                listEl.innerHTML = '<div class="insurance-data-muted">No notes added yet.</div>';
                return;
            }

            listEl.innerHTML = insuranceNotes.map((note, index) => `
                <div class="insurance-data-card" onclick="openInsuranceNoteDetail(${index})">
                    <h3 class="insurance-card-title" style="margin-bottom:0.35rem;">${note.title}</h3>
                    <p class="insurance-data-muted" style="margin-bottom:0.45rem;">${note.date}</p>
                    <p class="insurance-card-desc">${note.preview}</p>
                </div>
            `).join('');
        }

        function openInsuranceNoteDetail(index) {
            const note = insuranceNotes[index];
            if (!note) return;
            const content = `
                <div>
                    <p class="insurance-data-muted" style="margin-bottom:0.7rem;"><strong>Date:</strong> ${note.date}</p>
                    <p class="insurance-data-muted">${note.body}</p>
                </div>
            `;
            openInsuranceDetailModal(note.title, content);
        }

        function openInsuranceDetailModal(title, contentHtml) {
            const modal = document.getElementById('insuranceDetailModal');
            const titleEl = document.getElementById('insuranceDetailModalTitle');
            const contentEl = document.getElementById('insuranceDetailModalContent');
            if (!modal || !titleEl || !contentEl) return;

            titleEl.textContent = title;
            contentEl.innerHTML = contentHtml;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeInsuranceDetailModal() {
            const modal = document.getElementById('insuranceDetailModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function openInsuranceProvisionFormModal(provisionId = null) {
            if (!insuranceActiveActId) {
                alert('Select an Act before adding a provision.');
                return;
            }

            insuranceProvisionEditId = provisionId;
            const modal = document.getElementById('insuranceProvisionFormModal');
            const titleEl = document.getElementById('insuranceProvisionFormTitle');
            if (!modal || !titleEl) return;

            const provision = insuranceProvisions.find(item => item.provisionId === insuranceProvisionEditId);
            const isEdit = !!provision;
            titleEl.textContent = isEdit ? 'Edit Provision' : 'Add Provision';

            document.getElementById('insuranceProvisionSectionNumber').value = provision?.sectionNumber || '';
            document.getElementById('insuranceProvisionSectionTitle').value = provision?.sectionTitle || '';
            document.getElementById('insuranceProvisionSectionText').value = provision?.sectionText || '';
            document.getElementById('insuranceProvisionPlainExplanation').value = provision?.plainExplanation || '';
            document.getElementById('insuranceProvisionPurpose').value = provision?.purposeOfSection || '';
            document.getElementById('insuranceProvisionTags').value = joinCommaValues(provision?.tags || []);
            document.getElementById('insuranceProvisionRelatedSections').value = joinCommaValues(provision?.relatedSections || []);
            document.getElementById('insuranceProvisionSupervisoryFocusAreas').value = provision?.supervisoryFocusAreas || '';
            document.getElementById('insuranceProvisionPracticalExamples').value = provision?.practicalExamples || '';

            const modalBox = modal.querySelector('.insurance-modal-box');
            if (modalBox) modalBox.scrollTop = 0;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            const firstInput = document.getElementById('insuranceProvisionSectionNumber');
            if (firstInput) firstInput.focus();
        }

        function closeInsuranceProvisionFormModal() {
            const modal = document.getElementById('insuranceProvisionFormModal');
            if (modal) modal.classList.remove('active');
            insuranceProvisionEditId = null;
            document.body.style.overflow = 'auto';
        }

        async function saveInsuranceProvision() {
            if (!insuranceActiveActId) {
                alert('Select an Act before saving a provision.');
                return;
            }

            const sectionNumber = document.getElementById('insuranceProvisionSectionNumber')?.value.trim() || '';
            const sectionTitle = document.getElementById('insuranceProvisionSectionTitle')?.value.trim() || '';
            const sectionText = document.getElementById('insuranceProvisionSectionText')?.value.trim() || '';
            const plainExplanation = document.getElementById('insuranceProvisionPlainExplanation')?.value.trim() || '';
            const purposeOfSection = document.getElementById('insuranceProvisionPurpose')?.value.trim() || '';
            const tags = splitCommaValues(document.getElementById('insuranceProvisionTags')?.value || '');
            const relatedSections = splitCommaValues(document.getElementById('insuranceProvisionRelatedSections')?.value || '');
            const supervisoryFocusAreas = document.getElementById('insuranceProvisionSupervisoryFocusAreas')?.value.trim() || '';
            const practicalExamples = document.getElementById('insuranceProvisionPracticalExamples')?.value.trim() || '';

            if (!sectionNumber || !sectionTitle || !sectionText) {
                alert('Please complete Section Number, Section Title, and Section Text.');
                return;
            }

            const payload = {
                actId: insuranceActiveActId,
                sectionNumber,
                sectionTitle,
                sectionText,
                plainExplanation,
                purposeOfSection,
                tags,
                relatedSections,
                supervisoryFocusAreas,
                practicalExamples
            };

            try {
                if (insuranceProvisionEditId) {
                    await window.firebaseUpdateInsuranceProvision(insuranceProvisionEditId, payload);
                } else {
                    await window.firebaseCreateInsuranceProvision(payload);
                }
                await window.firebaseLoadInsuranceActsAndProvisions();
            } catch (error) {
                alert('Error saving provision: ' + error.message);
                console.error(error);
                return;
            }

            renderInsuranceActProvisions();
            closeInsuranceProvisionFormModal();
        }

        function openInsuranceNoteFormModal() {
            const modal = document.getElementById('insuranceNoteFormModal');
            if (!modal) return;
            setInsuranceDefaultNoteDate();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeInsuranceNoteFormModal() {
            const modal = document.getElementById('insuranceNoteFormModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function setInsuranceDefaultNoteDate() {
            const dateInput = document.getElementById('insuranceNewNoteDate');
            if (!dateInput) return;
            if (!dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }

        function saveInsuranceNoteDummy() {
            const title = document.getElementById('insuranceNewNoteTitle')?.value.trim() || '';
            const date = document.getElementById('insuranceNewNoteDate')?.value || '';
            const body = document.getElementById('insuranceNewNoteBody')?.value.trim() || '';

            if (!title || !date || !body) {
                alert('Please complete title, date, and note body.');
                return;
            }

            insuranceNotes.unshift({
                title,
                date,
                preview: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
                body
            });

            renderInsuranceNotes();
            closeInsuranceNoteFormModal();
            document.getElementById('insuranceNewNoteTitle').value = '';
            document.getElementById('insuranceNewNoteBody').value = '';
        }

        function renderInsuranceChatMessages() {
            const listEl = document.getElementById('insuranceChatMessages');
            if (!listEl) return;

            listEl.innerHTML = insuranceChatMessages.map(message => `
                <div class="insurance-chat-row ${message.role === 'user' ? 'user' : 'ai'}">
                    <div class="insurance-chat-bubble">${message.text}</div>
                </div>
            `).join('');

            listEl.scrollTop = listEl.scrollHeight;
        }

        function sendInsuranceChatMessage() {
            const input = document.getElementById('insuranceChatInput');
            if (!input) return;

            const text = input.value.trim();
            if (!text) return;

            insuranceChatMessages.push({ role: 'user', text });

            const firstProvision = insuranceProvisions[0];
            const aiText = firstProvision
                ? `Relevant Provision: ${firstProvision.sectionNumber} â€” ${firstProvision.sectionTitle}. Review tags: ${(firstProvision.tags || []).join(', ') || 'none'}.`
                : 'No provisions are saved yet. Add Acts and Provisions in the Act Provisions module for context-aware answers.';
            insuranceChatMessages.push({ role: 'ai', text: aiText });

            input.value = '';
            renderInsuranceChatMessages();
        }

        window.showInsuranceView = showInsuranceView;
        window.showInsuranceHome = showInsuranceHome;
        window.openInsuranceActsScreen = openInsuranceActsScreen;
        window.openInsuranceActProvisions = openInsuranceActProvisions;
        window.openInsuranceAddActModal = openInsuranceAddActModal;
        window.closeInsuranceAddActModal = closeInsuranceAddActModal;
        window.saveInsuranceAct = saveInsuranceAct;
        window.editInsuranceAct = editInsuranceAct;
        window.deleteInsuranceAct = deleteInsuranceAct;
        window.viewInsuranceProvisionDetails = viewInsuranceProvisionDetails;
        window.editInsuranceProvision = editInsuranceProvision;
        window.deleteInsuranceProvision = deleteInsuranceProvision;
        window.openInsuranceCompanyDetail = openInsuranceCompanyDetail;
        window.openInsuranceNoteDetail = openInsuranceNoteDetail;
        window.openInsuranceDetailModal = openInsuranceDetailModal;
        window.closeInsuranceDetailModal = closeInsuranceDetailModal;
        window.openInsuranceProvisionFormModal = openInsuranceProvisionFormModal;
        window.closeInsuranceProvisionFormModal = closeInsuranceProvisionFormModal;
        window.saveInsuranceProvision = saveInsuranceProvision;
        window.openInsuranceNoteFormModal = openInsuranceNoteFormModal;
        window.closeInsuranceNoteFormModal = closeInsuranceNoteFormModal;
        window.saveInsuranceNoteDummy = saveInsuranceNoteDummy;
        window.loadInsurersDropdown = loadInsurersDropdown;
        window.loadInsurerData = loadInsurerData;
        window.onInsurerChange = onInsurerChange;
        window.onInfoTypeChange = onInfoTypeChange;
        window.onSegmentChange = onSegmentChange;
        window.onTimelineChange = onTimelineChange;
        window.showSection = showSection;
        window.showPlaceholder = showPlaceholder;
        window.showInsuranceHandbookCategories = showInsuranceHandbookCategories;
        window.showInsuranceHandbookCategory = showInsuranceHandbookCategory;
        window.fetchInsurerDetails = fetchInsurerDetails;
        window.renderBasicInfo = renderBasicInfo;
        window.renderInsurerDetails = renderInsurerDetails;
        window.renderPremiumTable = renderPremiumTable;
        window.renderPremiumChart = renderPremiumChart;
        window.showSegmentDropdown = showSegmentDropdown;
        window.hideSegmentDropdown = hideSegmentDropdown;
        window.loadSegmentGDP = loadSegmentGDP;
        window.renderSegmentTable = renderSegmentTable;
        window.renderSegmentChart = renderSegmentChart;
        window.populateTimelineDropdown = populateTimelineDropdown;
        window.applyTimelineFilter = applyTimelineFilter;
        window.updateUI = updateUI;
        window.sendInsuranceChatMessage = sendInsuranceChatMessage;

        function getPersistedUIState() {
            try {
                const raw = localStorage.getItem(UI_STATE_STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch {
                return {};
            }
        }

        function persistUIState(nextState = {}) {
            try {
                const prev = getPersistedUIState();
                const merged = { ...prev, ...nextState };
                localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(merged));
            } catch {
            }
        }

        function clearPersistedUIState() {
            try {
                localStorage.removeItem(UI_STATE_STORAGE_KEY);
            } catch {
            }
        }

        window.getPersistedUIState = getPersistedUIState;
        window.persistUIState = persistUIState;
        window.clearPersistedUIState = clearPersistedUIState;

        function handleSignIn() {
            const email = document.getElementById('signInEmail').value.trim();
            const password = document.getElementById('signInPassword').value.trim();

            if (!email) { alert('Please enter email'); return; }
            if (!password) { alert('Please enter password'); return; }

            window.firebaseSignIn(email, password);
        }

        function handleLogout() {
            if (!confirm('Are you sure you want to logout?')) return;
            window.firebaseLogout();
        }

        function canAccessModule(moduleName) {
            const allowedModules = moduleAccessState.allowedModules;
            if (!allowedModules) return true;
            return allowedModules.has(moduleName);
        }

        function selectModule(moduleName) {
            if (!canAccessModule(moduleName)) {
                alert('You do not have access to this module.');
                return;
            }

            currentModule = moduleName;
            persistUIState({ module: moduleName });
            showApp();
            updateMobileTopHeader();
            
            // Update navbar and home tab for module
            updateNavbarForModule(moduleName);
            updateHomeForModule(moduleName);
            
            // Switch to home tab
            const defaultHomeTab = moduleName === 'Mobility - Physio'
                ? 'mobilityHome'
                : moduleName === 'AI_ML_DS'
                    ? 'aiHome'
                    : 'home';
            const homeBtn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === defaultHomeTab);
            if (homeBtn) switchTab(defaultHomeTab, homeBtn);
            updateMobileBottomNav(defaultHomeTab);
            
            if (currentModule === 'Tennis') {
                // Load Tennis module data
                hideModulePlaceholder();
                enableTennisTabs();
                setTimeout(async () => {
                    await fetchJournalsForUser();
                    renderSessionsList();
                    window.firebaseRenderHistoryList();
                    window.firebaseRenderMatchHistory();
                    await window.firebaseRenderJournalList();
                    initCalendar();
                }, 100);
            } else if (currentModule === 'Actuaries') {
                hideModulePlaceholder();
                setTimeout(() => {
                    if (window.initializeActuariesUI) window.initializeActuariesUI();
                    if (window.showActuaryModules) window.showActuaryModules();
                    const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === 'actuaryNotes');
                    switchTab('actuaryNotes', btn || null);
                }, 100);
            } else if (currentModule === 'Mobility - Physio') {
                hideModulePlaceholder();
                setTimeout(async () => {
                    if (window.firebaseRenderMobilitySessions) await window.firebaseRenderMobilitySessions();
                    if (window.firebaseRenderMobilityTemplates) await window.firebaseRenderMobilityTemplates();
                    if (window.initMobilityCalendar) window.initMobilityCalendar();
                }, 100);
            } else if (currentModule === 'Insurance') {
                hideModulePlaceholder();
                disableTennisTabs();
                setTimeout(async () => {
                    await initializeInsuranceModule();
                }, 80);
            } else if (currentModule === 'AI_ML_DS') {
                hideModulePlaceholder();
                setTimeout(async () => {
                    if (window.initializeAIStudyModule) await window.initializeAIStudyModule();
                }, 80);
            } else {
                // Show placeholder for other modules
                showModulePlaceholder(moduleName);
                disableTennisTabs();
            }
        }

        function updateNavbarForModule(moduleName) {
            const tennisTabs = ['home', 'sessions', 'match', 'history', 'calendar', 'journal'];
            const actuaryTabs = ['actuaryNotes', 'actuaryLearn'];
            const mobilityTabs = ['mobilityHome', 'mobilitySessions', 'mobilityTemplates', 'mobilityCalendar'];
            const aiStudyTabs = ['aiHome', 'aiSessions', 'aiCoursesBooks', 'aiHistory', 'aiCalendar', 'aiJournal'];
            const tabButtons = document.querySelectorAll('.tab-button');
            
            tabButtons.forEach(button => {
                const tabName = button.dataset.tab;
                
                if (moduleName === 'Tennis') {
                    // Show all tabs for Tennis module
                    if (tennisTabs.includes(tabName) || tabName === 'dashboard') {
                        button.style.display = 'inline-flex';
                    }
                    if (actuaryTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                    if (mobilityTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                    if (aiStudyTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                } else if (moduleName === 'Actuaries') {
                    if (actuaryTabs.includes(tabName) || tabName === 'dashboard') {
                        button.style.display = 'inline-flex';
                    }
                    if (tennisTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                    if (mobilityTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                    if (aiStudyTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                } else if (moduleName === 'Mobility - Physio') {
                    if (mobilityTabs.includes(tabName) || tabName === 'dashboard') {
                        button.style.display = 'inline-flex';
                    }
                    if (tennisTabs.includes(tabName) || actuaryTabs.includes(tabName) || aiStudyTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                } else if (moduleName === 'AI_ML_DS') {
                    if (aiStudyTabs.includes(tabName) || tabName === 'dashboard') {
                        button.style.display = 'inline-flex';
                    }
                    if (tennisTabs.includes(tabName) || actuaryTabs.includes(tabName) || mobilityTabs.includes(tabName)) {
                        button.style.display = 'none';
                    }
                } else {
                    // For other modules: hide Tennis tabs, keep dashboard
                    if (tennisTabs.includes(tabName)) {
                        button.style.display = 'none';
                    } else if (actuaryTabs.includes(tabName)) {
                        button.style.display = 'none';
                    } else if (mobilityTabs.includes(tabName)) {
                        button.style.display = 'none';
                    } else if (aiStudyTabs.includes(tabName)) {
                        button.style.display = 'none';
                    } else if (tabName === 'dashboard') {
                        button.style.display = 'inline-flex';
                    }
                }
            });
        }

        function updateHomeForModule(moduleName) {
            const tennisSection = document.getElementById('tennisHomeSection');
            const moduleSection = document.getElementById('moduleHomeSection');
            const moduleNameEl = document.getElementById('moduleHomeName');
            const insuranceContainer = document.getElementById('insuranceContainer');
            const genericPlaceholder = document.getElementById('genericModulePlaceholder');
            const aiModuleContainer = document.getElementById('aiModuleContainer');
            
            if (moduleName === 'Tennis') {
                // Show Tennis content, hide generic module content
                if (tennisSection) tennisSection.style.display = 'block';
                if (moduleSection) moduleSection.style.display = 'none';
                if (insuranceContainer) insuranceContainer.style.display = 'none';
                if (genericPlaceholder) genericPlaceholder.style.display = 'none';
                if (aiModuleContainer) aiModuleContainer.style.display = 'none';
            } else if (moduleName === 'Actuaries') {
                if (tennisSection) tennisSection.style.display = 'none';
                if (moduleSection) moduleSection.style.display = 'none';
                if (insuranceContainer) insuranceContainer.style.display = 'none';
                if (genericPlaceholder) genericPlaceholder.style.display = 'none';
                if (aiModuleContainer) aiModuleContainer.style.display = 'none';
            } else if (moduleName === 'Mobility - Physio') {
                if (tennisSection) tennisSection.style.display = 'none';
                if (moduleSection) moduleSection.style.display = 'none';
                if (insuranceContainer) insuranceContainer.style.display = 'none';
                if (genericPlaceholder) genericPlaceholder.style.display = 'none';
                if (aiModuleContainer) aiModuleContainer.style.display = 'none';
            } else if (moduleName === 'Insurance') {
                if (tennisSection) tennisSection.style.display = 'none';
                if (moduleSection) moduleSection.style.display = 'block';
                if (insuranceContainer) insuranceContainer.style.display = 'block';
                if (genericPlaceholder) genericPlaceholder.style.display = 'none';
                if (aiModuleContainer) aiModuleContainer.style.display = 'none';
            } else if (moduleName === 'AI_ML_DS') {
                if (tennisSection) tennisSection.style.display = 'none';
                if (moduleSection) moduleSection.style.display = 'none';
                if (insuranceContainer) insuranceContainer.style.display = 'none';
                if (genericPlaceholder) genericPlaceholder.style.display = 'none';
                if (aiModuleContainer) aiModuleContainer.style.display = 'block';
            } else {
                // Hide Tennis content, show generic module content
                if (tennisSection) tennisSection.style.display = 'none';
                if (moduleSection) moduleSection.style.display = 'block';
                if (insuranceContainer) insuranceContainer.style.display = 'none';
                if (genericPlaceholder) genericPlaceholder.style.display = 'block';
                if (aiModuleContainer) aiModuleContainer.style.display = 'none';
                // Update module name with proper formatting
                if (moduleNameEl) {
                    const displayName = moduleName.replace(/_/g, ' ');
                    moduleNameEl.textContent = displayName;
                }
            }
        }

        function showModulePlaceholder(moduleName) {
            const homeContent = document.getElementById('home');
            if (!homeContent) return;
            
            const placeholderId = 'modulePlaceholder';
            let placeholder = document.getElementById(placeholderId);
            
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.id = placeholderId;
                placeholder.style.cssText = 'text-align: center; padding: 3rem 1rem; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;';
                homeContent.appendChild(placeholder);
            }
            
            const displayName = moduleName.replace(/_/g, ' ');
            placeholder.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1.5rem;">ðŸ”„</div>
                <h2 style="color: #0f2540; font-size: 1.8rem; margin: 0 0 0.5rem 0;">${displayName}</h2>
                <p style="color: #999; font-size: 1.1rem; margin: 0;">This module is under development</p>
            `;
            placeholder.style.display = 'block';
        }

        function hideModulePlaceholder() {
            const placeholder = document.getElementById('modulePlaceholder');
            if (placeholder) placeholder.style.display = 'none';
        }

        function enableTennisTabs() {
            const tabs = document.querySelectorAll('[data-tab]');
            tabs.forEach(tab => {
                tab.style.opacity = '1';
                tab.style.pointerEvents = 'auto';
            });
        }

        function disableTennisTabs() {
            const tabs = document.querySelectorAll('[data-tab]');
            const disabledTabs = ['design', 'sessions', 'match', 'history', 'calendar', 'journal'];
            tabs.forEach(tab => {
                if (disabledTabs.includes(tab.dataset.tab)) {
                    tab.style.opacity = '0.5';
                    tab.style.pointerEvents = 'none';
                }
            });
        }

        function showDashboard() {
            document.getElementById('dashboard').style.display = 'flex';
            document.getElementById('dashboardHeader').style.display = 'flex';
            document.getElementById('dashboardUserEmail').textContent = currentUsername || 'user@example.com';
            document.getElementById('navbar').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'none';
            if (typeof applyModuleCardVisibility === 'function') {
                applyModuleCardVisibility(moduleAccessState.allowedModules);
            }
            currentModule = null;
            persistUIState({ module: null, tab: 'dashboard' });
            updateMobileTopHeader();
            updateMobileBottomNav('');
        }

        function showApp() {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('dashboardHeader').style.display = 'none';
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('mainContainer').style.display = 'block';
            updateMobileTopHeader();
            const activeTab = document.querySelector('.tab-content.active')?.id || '';
            updateMobileBottomNav(activeTab);
        }

        document.addEventListener('DOMContentLoaded', function() {
            const waitForAuthBootstrap = () => {
                if (typeof window.checkAuthState === 'function') {
                    window.checkAuthState();
                } else {
                    setTimeout(waitForAuthBootstrap, 50);
                }
            };
            waitForAuthBootstrap();
            updateMobileTopHeader();
            updateMobileBottomNav('');
            window.addEventListener('resize', () => {
                const activeTab = document.querySelector('.tab-content.active')?.id || '';
                updateMobileBottomNav(activeTab);
                updateMobileTopHeader();
            });
        });

(async function initializeFirebaseBootstrap() {
  // Import the functions you need from the SDKs you need
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js");
  const {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    setDoc,
    orderBy
  } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js");
  const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js");
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAJTqOvwqp8v5t4ev4q2jQoJU7YR5yYAsY",
    authDomain: "tennis-planner-7dd13.firebaseapp.com",
    projectId: "tennis-planner-7dd13",
    storageBucket: "tennis-planner-7dd13.firebasestorage.app",
    messagingSenderId: "912382977591",
    appId: "1:912382977591:web:62110a00fff74b263101b2",
    measurementId: "G-RFV0PV3T43"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Initialize Firestore
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

window.db = db;
window.firebaseAuth = auth;
window.storage = storage;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.collection = collection;
window.doc = doc;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.query = query;
window.where = where;
window.setDoc = setDoc;
window.orderBy = orderBy;
window.ref = ref;
window.uploadBytes = uploadBytes;
window.getDownloadURL = getDownloadURL;

const restrictedInsuranceEmail = 'meghana.nara@gmail.com';
const moduleCardConfig = [
    { id: 'tennisModule', module: 'Tennis' },
    { id: 'actuaryModule', module: 'Actuaries' },
    { id: 'mobilityModule', module: 'Mobility - Physio' },
    { id: 'insuranceModule', module: 'Insurance' },
    { id: 'aiModule', module: 'AI_ML_DS' }
];

function normalizeModuleName(moduleName) {
    return String(moduleName || '').trim().toLowerCase();
}

function resolveModuleAccess(user, userData = {}) {
    const resolvedEmail = String(userData?.email || user?.email || '').trim().toLowerCase();
    const modules = Array.isArray(userData?.modules) ? userData.modules : [];
    const normalizedModules = modules.map(normalizeModuleName).filter(Boolean);

    const restrictedByEmail = resolvedEmail === restrictedInsuranceEmail;
    const restrictedByModules = normalizedModules.length > 0 && normalizedModules.every(moduleName => moduleName === 'insurance');
    const insuranceOnlyUser = restrictedByEmail || restrictedByModules;

    return {
        insuranceOnlyUser,
        allowedModules: insuranceOnlyUser ? new Set(['Insurance']) : null
    };
}

function applyModuleCardVisibility(allowedModules) {
    moduleCardConfig.forEach(({ id, module }) => {
        const card = document.getElementById(id);
        if (!card) return;
        const shouldShow = !allowedModules || allowedModules.has(module);
        card.style.display = shouldShow ? '' : 'none';
        card.style.pointerEvents = shouldShow ? '' : 'none';
        card.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    });
}

window.applyModuleVisibilityAfterLogin = async function(user = auth.currentUser) {
    if (!user) {
        moduleAccessState = { insuranceOnlyUser: false, allowedModules: null };
        applyModuleCardVisibility(null);
        return moduleAccessState;
    }

    const preResolvedAccess = resolveModuleAccess(user, { email: user.email });
    moduleAccessState = preResolvedAccess;
    applyModuleCardVisibility(moduleAccessState.allowedModules);

    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        moduleAccessState = resolveModuleAccess(user, userData);
        applyModuleCardVisibility(moduleAccessState.allowedModules);

        if (currentModule && !canAccessModule(currentModule)) {
            showDashboard();
        }

        return moduleAccessState;
    } catch (error) {
        console.error('Error applying module visibility access:', error);
        applyModuleCardVisibility(moduleAccessState.allowedModules);
        return moduleAccessState;
    }
};

// Authentication Functions
window.checkAuthState = function() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            currentUsername = user.email;
            document.getElementById('currentUserDisplay').textContent = `\u{1F464} ${currentUsername}`;

            // Hide login first
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('dashboardUserEmail').textContent = currentUsername;

            const accessState = await window.applyModuleVisibilityAfterLogin(user);

            const savedState = window.getPersistedUIState ? window.getPersistedUIState() : {};
            const savedModule = savedState?.module || null;
            const savedTab = savedState?.tab || '';
            const canRestoreSavedModule = savedModule && (!accessState.allowedModules || accessState.allowedModules.has(savedModule));

            if (canRestoreSavedModule) {
                selectModule(savedModule);

                const fallbackTab = savedModule === 'Mobility - Physio'
                    ? 'mobilityHome'
                    : savedModule === 'AI_ML_DS'
                        ? 'aiHome'
                        : 'home';
                const targetTab = savedTab && savedTab !== 'dashboard' ? savedTab : fallbackTab;
                const targetButton = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === targetTab && b.style.display !== 'none');

                if (targetButton) {
                    switchTab(targetTab, targetButton);
                } else {
                    const fallbackButton = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === fallbackTab && b.style.display !== 'none');
                    if (fallbackButton) switchTab(fallbackTab, fallbackButton);
                }
            } else {
                document.getElementById('dashboard').style.display = 'flex';
                document.getElementById('dashboardHeader').style.display = 'flex';
                document.getElementById('navbar').style.display = 'none';
                document.getElementById('mainContainer').style.display = 'none';
            }
            
        } else {
            // Show login, hide everything else
            currentUserId = null;
            currentUsername = null;
            currentModule = null;
            moduleAccessState = { insuranceOnlyUser: false, allowedModules: null };
            applyModuleCardVisibility(null);
            document.getElementById('currentUserDisplay').textContent = '';
            document.getElementById('loginPage').style.display = 'flex';
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('dashboardHeader').style.display = 'none';
            document.getElementById('navbar').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'none';
        }
    });
};

window.firebaseSignIn = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        currentUserId = user.uid;
        currentUsername = user.email;
        document.getElementById('currentUserDisplay').textContent = `\u{1F464} ${currentUsername}`;
        
        document.getElementById('signInEmail').value = '';
        document.getElementById('signInPassword').value = '';
    } catch (error) {
        alert('Login failed: ' + error.message);
        console.error(error);
    }
};

window.firebaseLogout = async function() {
    try {
        await signOut(auth);
        
        currentUserId = null;
        currentUsername = null;
        document.getElementById('currentUserDisplay').textContent = '';
        
        // Show login, hide app and dashboard
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('dashboardHeader').style.display = 'none';
        document.getElementById('navbar').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'none';
        if (window.clearPersistedUIState) window.clearPersistedUIState();
    } catch (error) {
        alert('Logout failed: ' + error.message);
        console.error(error);
    }
};
window.query = query;
window.where = where;

// Firebase-dependent functions

})();
