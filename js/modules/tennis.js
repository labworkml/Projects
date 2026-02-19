/* Tennis module logic extracted from index.html */
window.firebaseFinalizeDesignSession = async function() {
    const date = document.getElementById('designDate').value;
    if (!date) { alert('Please select a date for the session'); return; }
    if (!window.designItems || window.designItems.length === 0) { alert('Please add at least one type/exercise'); return; }
    
    try {
        const sessionData = {
            date,
            items: (window.designItems || []).slice(),
            created: Date.now(),
            userId: currentUserId,
            module: currentModule
        };
        
        if (window.editingSessionIndex !== null) {
            // Update existing document - validate userId first
            const existingDoc = await getDoc(doc(db, 'sessions', window.editingSessionIndex));
            if (existingDoc.exists() && existingDoc.data().userId !== currentUserId) {
                alert('You do not have permission to edit this session!');
                return;
            }
            await updateDoc(doc(db, 'sessions', window.editingSessionIndex), sessionData);
        } else {
            // Create new document
            await addDoc(collection(db, 'sessions'), sessionData);
        }
        
        window.designItems = [];
        renderDesignItems();
        document.getElementById('designForm').reset();
        document.getElementById('morePrompt').style.display = 'none';
        await window.firebaseRenderSessionsList();
        const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === 'sessions');
        window.editingSessionIndex = null;
        switchTab('sessions', btn || null);
    } catch (error) {
        alert('Error saving session: ' + error.message);
        console.error(error);
    }
};

window.firebaseRenderSessionsList = async function() {
    const listEl = document.getElementById('sessionsList');
    if (!listEl) return;

    const q = query(collection(db, "sessions"), where("userId", "==", currentUserId), where("module", "==", currentModule));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        listEl.innerHTML = '<li>No sessions planned yet.</li>';
        return;
    }

    let html = "";

    snapshot.forEach(docSnap => {
        const s = docSnap.data();
        const id = docSnap.id;

        const items = (s.items || [])
            .map(it => `<div>${it.type}: ${it.exercise} â€” ${it.minutes} min</div>`)
            .join('');

        // Store session data in map using document ID
        window.sessionDataMap[id] = {date: s.date, items: s.items};

        html += `
    <li>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${s.date}</strong>
        <div>
          <button onclick="window.startSessionById('${id}')" class="submit-btn" style="background:var(--accent);">Start Session</button>
          <button onclick="editSession('${id}')" class="submit-btn">Edit</button>
          <button onclick="deleteSession('${id}')" style="background:#ef4444;border:none;padding:.55rem .8rem;border-radius:8px;color:#fff;cursor:pointer">Delete</button>
        </div>
      </div>
      <div style="margin-top:0.5rem;">${items}</div>
    </li>
`;
    });

    listEl.innerHTML = html;
};

window.firebaseEditSession = async function(docId) {
    try {
        const docRef = doc(db, 'sessions', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return alert('Session not found');
        
        const s = docSnap.data();
        
        // Validate userId - prevent users from editing others' sessions
        if (s.userId !== currentUserId) {
            alert('You do not have permission to edit this session!');
            return;
        }
        
        document.getElementById('designDate').value = s.date;
        window.designItems = s.items.slice();
        window.editingSessionIndex = docId;
        renderDesignItems();
        const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === 'design');
        switchTab('design', btn || null);
    } catch (error) {
        alert('Error loading session: ' + error.message);
        console.error(error);
    }
};

window.firebaseDeleteSession = async function(docId) {
    try {
        const docRef = doc(db, 'sessions', docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert('Session not found!');
            return;
        }
        
        const s = docSnap.data();
        
        // Validate userId - prevent users from deleting others' sessions
        if (s.userId !== currentUserId) {
            alert('You do not have permission to delete this session!');
            return;
        }
        
        if (!confirm('Delete this planned session?')) return;
        
        await deleteDoc(doc(db, 'sessions', docId));
        await window.firebaseRenderSessionsList();
    } catch (error) {
        alert('Error deleting session: ' + error.message);
        console.error(error);
    }
};

window.firebaseSaveSessionToHistory = async function(sessionData, completedCount, totalItems, sessionId) {
    try {
        const historyData = {
            date: sessionData.date,
            items: sessionData.items,
            completedItemsCount: completedCount,
            totalItems: totalItems,
            finishedAtTimestamp: Date.now(),
            userId: currentUserId,
            module: currentModule
        };

        await addDoc(collection(db, 'history'), historyData);

        // Delete the session from sessions collection using the stored ID
        if (sessionId) {
            await deleteDoc(doc(db, 'sessions', sessionId));
        }

        alert('Session saved to history!');
        closeSessionModal();
        await window.firebaseRenderSessionsList(); // Refresh sessions list
        await window.firebaseRenderHistoryList(); // Refresh history list
    } catch (error) {
        alert('Error saving session: ' + error.message);
        console.error(error);
    }
};

window.firebaseRenderHistoryList = async function() {
    const listEl = document.getElementById('historyList');
    if (!listEl) return;

    const typeFilter = (document.getElementById('historyTypeFilter')?.value || 'all');
    const dateFilter = document.getElementById('historyDateFilter')?.value || '';
    const searchQuery = (document.getElementById('historySearchInput')?.value || '').trim().toLowerCase();

    if (typeFilter === 'matches') {
        listEl.innerHTML = '<li style="color:#666;padding:1rem;">Filtered to match records.</li>';
        return;
    }

    const q = query(collection(db, 'history'), where("userId", "==", currentUserId), where("module", "==", currentModule));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        listEl.innerHTML = '<li style="color:#666;padding:1rem;">No completed sessions yet.</li>';
        return;
    }

        let html = "";
        await fetchJournalsForUser();
        snapshot.forEach(docSnap => {
                const h = docSnap.data();
                if (dateFilter && h.date !== dateFilter) return;
                const completionPercentage = h.totalItems > 0 ? Math.round((h.completedItemsCount / h.totalItems) * 100) : 0;
                const finishedDate = new Date(h.finishedAtTimestamp).toLocaleString();
                const items = (h.items || [])
                        .map(it => `<div>${it.type}: ${it.exercise} â€” ${it.minutes} min</div>`)
                        .join('');
                const combinedText = `${h.date} ${items}`.toLowerCase();
                if (searchQuery && !combinedText.includes(searchQuery)) return;
                const journalBtnText = journalMapByRecordId[docSnap.id] ? 'Edit Journal' : 'Add Journal';
                const journalBtn = `<button class='submit-btn btn-secondary btn-sm' style='margin-top:0.5rem;' onclick='openJournalForRecord("session", "${docSnap.id}", "${h.date}")'>${journalBtnText}</button>`;
                const editBtn = `<button class='submit-btn btn-success btn-sm' onclick='editHistorySession("${docSnap.id}")'>Edit</button>`;
                const deleteBtn = `<button class='submit-btn btn-danger btn-sm' onclick='deleteHistorySession("${docSnap.id}")'>Delete</button>`;
                html += `
        <li>
            <div class="history-card-header">
                <div>
                    <strong>${h.date}</strong>
                    <p style="color:var(--muted);font-size:0.85rem;margin:0.3rem 0 0 0;">Completed: ${h.completedItemsCount}/${h.totalItems} items <span class="badge badge-accent">${completionPercentage}%</span></p>
                    <p style="color:var(--muted);font-size:0.8rem;margin:0.2rem 0 0 0;">${finishedDate}</p>
                    ${journalBtn}
                </div>
                <div class="history-actions">
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
            <div style="margin-top:0.5rem;">${items}</div>
        </li>
`;
        });
        listEl.innerHTML = html || '<li style="color:#666;padding:1rem;">No sessions match the filters.</li>';
};

window.firebaseSaveMatchRecord = async function(matchData) {
    try {
        const matchRecord = {
            date: matchData.date,
            opponent: matchData.opponent,
            score: matchData.score,
            result: matchData.result,
            savedAtTimestamp: Date.now(),
            userId: currentUserId,
            module: currentModule
        };

        await addDoc(collection(db, 'matches'), matchRecord);

        alert('Match record saved!');
        document.getElementById('matchForm').reset();
        await window.firebaseRenderMatchHistory(); initCalendar();
    } catch (error) {
        alert('Error saving match record: ' + error.message);
        console.error(error);
    }
};

window.firebaseUpdateMatchRecord = async function(docId, matchData) {
    try {
        await updateDoc(doc(db, 'matches', docId), {
            date: matchData.date,
            opponent: matchData.opponent,
            score: matchData.score,
            result: matchData.result
        });
        alert('Match record updated!');
        await window.firebaseRenderMatchHistory();
        initCalendar();
    } catch (error) {
        alert('Error updating match record: ' + error.message);
        console.error(error);
    }
};

window.firebaseRenderMatchHistory = async function() {
    const listEl = document.getElementById('matchHistoryList');
    if (!listEl) return;

        const typeFilter = (document.getElementById('historyTypeFilter')?.value || 'all');
        const dateFilter = document.getElementById('historyDateFilter')?.value || '';
        const searchQuery = (document.getElementById('historySearchInput')?.value || '').trim().toLowerCase();

        if (typeFilter === 'sessions') {
                listEl.innerHTML = '<li style="color:#666;padding:1rem;">Filtered to training sessions.</li>';
                return;
        }

    const q = query(collection(db, 'matches'), where("userId", "==", currentUserId), where("module", "==", currentModule));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        listEl.innerHTML = '<li style="color:#666;padding:1rem;">No match records yet.</li>';
        return;
    }


        let html = "";
        await fetchJournalsForUser();
        snapshot.forEach(docSnap => {
            const m = docSnap.data();
            const savedDate = new Date(m.savedAtTimestamp).toLocaleString();
                        if (dateFilter && m.date !== dateFilter) return;
                        const resultBadgeClass = m.result === 'Win' ? 'badge-success' : m.result === 'Loss' ? 'badge-danger' : 'badge-warning';
                        const combinedText = `${m.date} ${m.opponent} ${m.score} ${m.result}`.toLowerCase();
                        if (searchQuery && !combinedText.includes(searchQuery)) return;
            const journalBtnText = journalMapByRecordId[docSnap.id] ? 'Edit Journal' : 'Add Journal';
            const journalBtn = `<button class='submit-btn btn-secondary btn-sm' style='margin-top:0.5rem;' onclick='openJournalForRecord("match", "${docSnap.id}", "${m.date}")'>${journalBtnText}</button>`;
                        const editBtn = `<button class='submit-btn btn-success btn-sm' onclick='editMatchRecord("${docSnap.id}")'>Edit</button>`;
            const deleteBtn = `<button class='submit-btn btn-danger btn-sm' onclick='deleteMatchRecord("${docSnap.id}")'>Delete</button>`;
            html += `
        <li>
                    <div class="history-card-header">
            <div style="flex:1;">
              <strong>${m.date}</strong> vs <strong>${m.opponent}</strong>
              <p style="color:var(--muted);font-size:0.85rem;margin:0.3rem 0 0 0;">Score: ${m.score}</p>
                            <div style="margin:0.3rem 0 0 0;"><span class="badge ${resultBadgeClass}">${m.result}</span></div>
              <p style="color:var(--muted);font-size:0.8rem;margin:0.2rem 0 0 0;">${savedDate}</p>
              ${journalBtn}
            </div>
                        <div class="history-actions">
              ${editBtn}
              ${deleteBtn}
            </div>
          </div>
        </li>
    `;
        });
                listEl.innerHTML = html || '<li style="color:#666;padding:1rem;">No matches match the filters.</li>';
};

window.deleteJournalsForRecord = async function(recordId) {
    const q = query(collection(db, 'journals'), where('userId', '==', currentUserId), where('module', '==', currentModule), where('recordId', '==', recordId));
    const snapshot = await getDocs(q);
    const deletePromises = [];
    snapshot.forEach(docSnap => {
        deletePromises.push(deleteDoc(doc(db, 'journals', docSnap.id)));
    });
    await Promise.all(deletePromises);
};

window.editHistorySession = async function(docId) {
    try {
        const docRef = doc(db, 'history', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return alert('Session not found');
        const h = docSnap.data();
        if (h.userId !== currentUserId) return alert('You do not have permission to edit this session!');
        openHistoryEditModal(docId, h.date || '');
    } catch (error) {
        alert('Error editing session: ' + error.message);
        console.error(error);
    }
};

window.openHistoryEditModal = function(docId, dateValue) {
    currentHistoryEditId = docId;
    const modal = document.getElementById('historyEditModal');
    const dateInput = document.getElementById('historyEditDate');
    if (dateInput) dateInput.value = dateValue;
    if (modal) modal.classList.add('active');
};

window.closeHistoryEditModal = function() {
    const modal = document.getElementById('historyEditModal');
    if (modal) modal.classList.remove('active');
    currentHistoryEditId = null;
};

window.saveHistoryEdit = async function() {
    const dateInput = document.getElementById('historyEditDate');
    const newDate = dateInput ? dateInput.value : '';
    if (!currentHistoryEditId) return;
    if (!newDate) { alert('Please select a date'); return; }
    try {
        await updateDoc(doc(db, 'history', currentHistoryEditId), { date: newDate });
        closeHistoryEditModal();
        await window.firebaseRenderHistoryList();
        initCalendar();
    } catch (error) {
        alert('Error editing session: ' + error.message);
        console.error(error);
    }
};

window.deleteHistorySession = async function(docId) {
    if (!confirm('This will delete the session and all associated journal entries. Continue?')) return;
    try {
        const docRef = doc(db, 'history', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return alert('Session not found');
        const h = docSnap.data();
        if (h.userId !== currentUserId) return alert('You do not have permission to delete this session!');
        await deleteJournalsForRecord(docId);
        await deleteDoc(docRef);
        await window.firebaseRenderHistoryList();
        initCalendar();
    } catch (error) {
        alert('Error deleting session: ' + error.message);
        console.error(error);
    }
};

window.editMatchRecord = async function(docId) {
    try {
        const docRef = doc(db, 'matches', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return alert('Match record not found');
        const m = docSnap.data();
        if (m.userId !== currentUserId) return alert('You do not have permission to edit this match!');
        document.getElementById('matchDate').value = m.date || '';
        document.getElementById('opponentName').value = m.opponent || '';
        document.getElementById('matchScore').value = m.score || '';
        document.getElementById('matchResult').value = m.result || '';
        currentMatchEditId = docId;
        setMatchEditMode(true);
        const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.dataset.tab === 'match');
        switchTab('match', btn || null);
    } catch (error) {
        alert('Error editing match: ' + error.message);
        console.error(error);
    }
};

window.deleteMatchRecord = async function(docId) {
    if (!confirm('This will delete the match record and all associated journal entries. Continue?')) return;
    try {
        const docRef = doc(db, 'matches', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return alert('Match record not found');
        const m = docSnap.data();
        if (m.userId !== currentUserId) return alert('You do not have permission to delete this match!');
        await deleteJournalsForRecord(docId);
        await deleteDoc(docRef);
        await window.firebaseRenderMatchHistory();
        initCalendar();
    } catch (error) {
        alert('Error deleting match: ' + error.message);
        console.error(error);
    }
};

window.firebaseClearTrainingHistory = async function() {
    try {
        const q = query(collection(db, 'history'), where("userId", "==", currentUserId));
        const snapshot = await getDocs(q);
        const deletePromises = [];
        
        snapshot.forEach(docSnap => {
            deletePromises.push(deleteDoc(doc(db, 'history', docSnap.id)));
        });
        
        await Promise.all(deletePromises);
        
        alert('Training history cleared!');
        await window.firebaseRenderHistoryList();
    } catch (error) {
        alert('Error clearing training history: ' + error.message);
        console.error(error);
    }
};

window.firebaseClearMatchHistory = async function() {
    try {
        const q = query(collection(db, 'matches'), where("userId", "==", currentUserId));
        const snapshot = await getDocs(q);
        const deletePromises = [];
        
        snapshot.forEach(docSnap => {
            deletePromises.push(deleteDoc(doc(db, 'matches', docSnap.id)));
        });
        
        await Promise.all(deletePromises);
        
        alert('Match history cleared!');
        await window.firebaseRenderMatchHistory(); initCalendar();
    } catch (error) {
        alert('Error clearing match history: ' + error.message);
        console.error(error);
    }
};

// --- Journal Global State ---
let currentJournalContext = null; // { type, recordId, date }
let currentJournalDocId = null;
let journalMapByRecordId = {}; // { [recordId]: { docId, ...data } }
let currentJournalViewContext = null; // { type, recordId, date }
let dictationRecognition = null;
let isDictating = false;

// --- Modal UI Functions ---
function openJournalForRecord(type, recordId, date) {
    currentJournalContext = { type, recordId, date };
    currentJournalDocId = null;
    const modal = document.getElementById('journalEntryModal');
    const textarea = document.getElementById('journalEntryTextarea');
    const title = document.getElementById('journalModalTitle');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
        textarea.focus();
        window.scrollTo({top:0,behavior:'smooth'});
    }, 10);
    // Title
    title.textContent = (journalMapByRecordId[recordId]) ? 'Edit Journal' : 'Add Journal';
    textarea.value = '';
    // Query Firestore for existing journal
    const journal = journalMapByRecordId[recordId];
    if (journal) {
        textarea.value = journal.text;
        currentJournalDocId = journal.docId;
    } else {
        textarea.value = '';
        currentJournalDocId = null;
    }
}

function closeJournalEntryModal() {
    const modal = document.getElementById('journalEntryModal');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 180);
    currentJournalContext = null;
    currentJournalDocId = null;
    stopDictation();
}

function openJournalViewModal(type, recordId, date, text) {
    currentJournalViewContext = { type, recordId, date };
    const modal = document.getElementById('journalViewModal');
    const title = document.getElementById('journalViewTitle');
    const textEl = document.getElementById('journalViewText');
    title.textContent = `${date} (${type})`;
    textEl.textContent = text || '';
    modal.classList.add('active');
}

function openJournalViewModalFromCard(cardEl) {
    if (!cardEl) return;
    const type = cardEl.getAttribute('data-type') || '';
    const recordId = cardEl.getAttribute('data-record-id') || '';
    const date = cardEl.getAttribute('data-date') || '';
    const text = decodeURIComponent(cardEl.getAttribute('data-text') || '');
    openJournalViewModal(type, recordId, date, text);
}

function closeJournalViewModal() {
    const modal = document.getElementById('journalViewModal');
    modal.classList.remove('active');
    currentJournalViewContext = null;
}

function editJournalFromView() {
    if (!currentJournalViewContext) return;
    const { type, recordId, date } = currentJournalViewContext;
    closeJournalViewModal();
    openJournalForRecord(type, recordId, date);
}

function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function startDictation() {
    const RecognitionConstructor = getSpeechRecognition();
    const statusEl = document.getElementById('dictationStatus');
    const textarea = document.getElementById('journalEntryTextarea');
    if (!RecognitionConstructor) {
        alert('Dictation is not supported in this browser.');
        return;
    }
    if (isDictating) {
        return;
    }
    dictationRecognition = new RecognitionConstructor();
    dictationRecognition.continuous = false;
    dictationRecognition.interimResults = false;
    dictationRecognition.maxAlternatives = 1;
    dictationRecognition.lang = navigator.language || 'en-US';
    isDictating = true;
    statusEl.style.display = 'inline';

    dictationRecognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ')
            .trim();
        if (transcript) {
            const separator = textarea.value && !textarea.value.endsWith(' ') ? ' ' : '';
            textarea.value = `${textarea.value}${separator}${transcript}`;
        }
        dictationRecognition.stop();
    };

    dictationRecognition.onerror = (event) => {
        console.error('Dictation error', event);
        alert('Dictation error: ' + event.error);
    };

    dictationRecognition.onend = () => {
        isDictating = false;
        statusEl.style.display = 'none';
    };

    try {
        dictationRecognition.start();
    } catch (error) {
        console.error('Dictation start failed', error);
        alert('Unable to start dictation.');
        isDictating = false;
        statusEl.style.display = 'none';
    }
}

function stopDictation() {
    if (dictationRecognition && isDictating) {
        dictationRecognition.stop();
    }
}

async function saveJournalEntry() {
    const textarea = document.getElementById('journalEntryTextarea');
    let text = textarea.value.trim();
    if (!text) { textarea.focus(); alert('Please add text'); return; }
    
    const { type, recordId, date } = currentJournalContext;
    
    const journalsRef = collection(db, 'journals');
    if (currentJournalDocId) {
        // Update
        const updateData = { text };
        await updateDoc(doc(db, 'journals', currentJournalDocId), updateData);
    } else {
        // Add
        const docData = {
            userId: currentUserId,
            type,
            recordId,
            date,
            text,
            createdAt: Date.now(),
            module: currentModule
        };
        await addDoc(journalsRef, docData);
    }
    closeJournalEntryModal();
    await refreshAllJournalUI();
}

// --- Refresh Logic ---
async function refreshAllJournalUI() {
    await fetchJournalsForUser();
    if (window.firebaseRenderHistoryList) await window.firebaseRenderHistoryList();
    if (window.firebaseRenderMatchHistory) await window.firebaseRenderMatchHistory();
    if (window.firebaseRenderJournalList) await window.firebaseRenderJournalList();
}

// --- Fetch all journals for user and build map ---
async function fetchJournalsForUser() {
    journalMapByRecordId = {};
    const q = query(collection(db, 'journals'), where('userId', '==', currentUserId), where('module', '==', currentModule));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        journalMapByRecordId[data.recordId] = { ...data, docId: docSnap.id };
    });
}

// --- Journal Tab Renderer ---
window.firebaseRenderJournalList = async function() {
    const listEl = document.getElementById('journalList');
    if (!listEl) return;
    
    try {
        const q = query(collection(db, 'journals'), where('userId', '==', currentUserId), where('module', '==', currentModule));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listEl.innerHTML = '<li style="color:#666;padding:1.5rem;text-align:center;">No journal entries yet.</li>';
            return;
        }
        
        const typeFilter = (document.getElementById('journalTypeFilter')?.value || 'all');
        const dateFilter = document.getElementById('journalDateFilter')?.value || '';
        const searchQuery = (document.getElementById('journalSearchInput')?.value || '').trim().toLowerCase();

        const journalArray = snapshot.docs.map(docSnap => ({
            ...docSnap.data(),
            docId: docSnap.id
        }));
        
        // Sort by createdAt descending in JavaScript
        journalArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        let html = '';
        const filteredArray = journalArray.filter(j => {
            if (typeFilter !== 'all' && j.type !== typeFilter) return false;
            if (dateFilter && j.date !== dateFilter) return false;
            const combinedText = `${j.date} ${j.text || ''}`.toLowerCase();
            if (searchQuery && !combinedText.includes(searchQuery)) return false;
            return true;
        });

        if (filteredArray.length === 0) {
            listEl.innerHTML = '<li style="color:#666;padding:1.5rem;text-align:center;">No journal entries match the filters.</li>';
            return;
        }

        filteredArray.forEach(j => {
            const typeColor = j.type === 'session' ? '#ef4444' : '#3b82f6';
                        const encodedText = encodeURIComponent(j.text || '');
            html += `<li>
                            <div class='journal-card' role='button' tabindex='0' onclick='openJournalViewModalFromCard(this)' data-type='${j.type}' data-record-id='${j.recordId}' data-date='${j.date}' data-text='${encodedText}'>
                                <div style='font-size:1.08rem;font-weight:600;color:#0f2540;'>${j.date} <span style='background:${typeColor};color:white;padding:0.3rem 0.6rem;border-radius:6px;font-size:0.85rem;font-weight:500;'>${j.type}</span></div>
                                <div class='journal-preview'>${j.text || ''}</div>
                            </div>
            </li>`;
        });
        listEl.innerHTML = html;
    } catch (error) {
        console.error('Error rendering journal list:', error);
        listEl.innerHTML = '<li style="color:#ef4444;padding:1.5rem;text-align:center;">Error loading journal entries. Check console.</li>';
    }
}

let calTrainDates={}, calMatchDates={}, calTrainDetails={}, calMatchDetails={};
let calMobilityDates={}, calMobilityDetails={};

function initCalendar(){
    const m=document.getElementById("calMonth");
    const y=document.getElementById("calYear");
    if(!m || !y) {
        console.error('Calendar elements not found');
        return;
    }
    
    // Clear previous options
    m.innerHTML = '';
    y.innerHTML = '';
    
    const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    months.forEach((mo,i)=>{
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = mo;
        m.appendChild(opt);
    });
    
    const cy=new Date().getFullYear();
    for(let yr=cy-2;yr<=cy+2;yr++) {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = yr;
        y.appendChild(opt);
    }
    
    const now=new Date();
    m.value=now.getMonth(); 
    y.value=now.getFullYear();
    
    m.onchange=renderCalendar; 
    y.onchange=renderCalendar;
    
    loadCalendarData();
}

async function loadCalendarData(){
    try {
        calTrainDates={}; 
        calMatchDates={};
        calTrainDetails={};
        calMatchDetails={};
        
        if(!currentUserId) {
            console.log('No user logged in');
            renderCalendar();
            return;
        }
        
        const hSnap=await getDocs(query(collection(db,"history"), where("userId","==",currentUserId), where("module","==",currentModule)));
        hSnap.forEach(d=> {
            const h = d.data();
            const dateStr = h.date;
            if(dateStr) {
                calTrainDates[dateStr]=true;
                if (!calTrainDetails[dateStr]) calTrainDetails[dateStr]=[];
                calTrainDetails[dateStr].push(h);
                console.log('Training date:', dateStr);
            }
        });
        
        const mSnap=await getDocs(query(collection(db,"matches"), where("userId","==",currentUserId), where("module","==",currentModule)));
        mSnap.forEach(d=> {
            const m = d.data();
            const dateStr = m.date;
            if(dateStr) {
                calMatchDates[dateStr]=true;
                if (!calMatchDetails[dateStr]) calMatchDetails[dateStr]=[];
                calMatchDetails[dateStr].push(m);
                console.log('Match date:', dateStr);
            }
        });
        
        renderCalendar();
    } catch (error) {
        console.error('Error loading calendar data:', error);
        renderCalendar();
    }
}

function renderCalendar(){
    const monthEl=document.getElementById("calMonth");
    const yearEl=document.getElementById("calYear");
    
    if(!monthEl || !yearEl) {
        console.error('Calendar selectors not found');
        return;
    }
    
    const month=parseInt(monthEl.value);
    const year=parseInt(yearEl.value);
    
    const first=new Date(year,month,1);
    const last=new Date(year,month+1,0);
    const start=first.getDay();
    const days=last.getDate();
    const grid=document.getElementById("calendarGrid");
    
    if(!grid) {
        console.error('Calendar grid not found');
        return;
    }
    
    grid.innerHTML="";
    
    // Create header row with day names
    const headerRow=document.createElement("div"); 
    headerRow.className="calendar-row";
    const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    dayNames.forEach(day=>{
        const dayCell=document.createElement("div");
        dayCell.className="calendar-cell";
        dayCell.textContent=day;
        dayCell.style.fontWeight="700";
        dayCell.style.color="#0f2540";
        dayCell.style.background="transparent";
        headerRow.appendChild(dayCell);
    });
    grid.appendChild(headerRow);
    
    let row=document.createElement("div"); 
    row.className="calendar-row";
    
    // Add empty cells for days before month starts
    for(let i=0;i<start;i++) {
        const emptyCell=document.createElement("div");
        emptyCell.className="calendar-cell";
        emptyCell.style.background='transparent';
        row.appendChild(emptyCell);
    }
    
    // Add date cells
    for(let d=1;d<=days;d++){
        const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const cell=document.createElement("div");
        cell.className="calendar-cell";
        
        if(calTrainDates[key]) {
            cell.classList.add("cal-train");
        } else if(calMatchDates[key]) {
            cell.classList.add("cal-match");
        }
        
        cell.textContent=d;
        cell.addEventListener('click', () => openCalendarDetail(key));
        row.appendChild(cell);
        
        if((start+d)%7===0){ 
            grid.appendChild(row); 
            row=document.createElement("div"); 
            row.className="calendar-row"; 
        }
    }
    
    // Append final row if it has cells
    if(row.children.length > 0) grid.appendChild(row);
    
    console.log('Calendar rendered for', month, year);
}

function openCalendarDetail(dateStr) {
    const modal = document.getElementById('calendarDetailModal');
    const title = document.getElementById('calendarDetailTitle');
    const content = document.getElementById('calendarDetailContent');
    if (!modal || !title || !content) return;
    title.textContent = dateStr;
    const sessions = calTrainDetails[dateStr] || [];
    const matches = calMatchDetails[dateStr] || [];
    let html = '';

    if (sessions.length === 0 && matches.length === 0) {
        html = '<p class="muted">No sessions or matches for this date.</p>';
    }

    if (sessions.length > 0) {
        html += '<div class="calendar-detail-section"><div class="calendar-detail-title">Training Sessions</div>';
        sessions.forEach(s => {
            const itemsText = (s.items || []).map(it => `${it.type}: ${it.exercise} â€” ${it.minutes} min`).join(' | ');
            html += `<div class="calendar-detail-item">${itemsText || 'Session completed'}</div>`;
        });
        html += '</div>';
    }

    if (matches.length > 0) {
        html += '<div class="calendar-detail-section"><div class="calendar-detail-title">Matches</div>';
        matches.forEach(m => {
            const resultBadgeClass = m.result === 'Win' ? 'badge-success' : m.result === 'Loss' ? 'badge-danger' : 'badge-warning';
            html += `<div class="calendar-detail-item">${m.opponent} â€” ${m.score} <span class="badge ${resultBadgeClass}">${m.result}</span></div>`;
        });
        html += '</div>';
    }

    content.innerHTML = html;
    modal.classList.add('active');
}

function closeCalendarDetailModal() {
    const modal = document.getElementById('calendarDetailModal');
    if (modal) modal.classList.remove('active');
}

function initMobilityCalendar() {
    const m = document.getElementById('mobilityCalMonth');
    const y = document.getElementById('mobilityCalYear');
    if (!m || !y) return;

    m.innerHTML = '';
    y.innerHTML = '';

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    months.forEach((monthName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = monthName;
        m.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        y.appendChild(option);
    }

    const now = new Date();
    m.value = now.getMonth();
    y.value = now.getFullYear();

    m.onchange = renderMobilityCalendar;
    y.onchange = renderMobilityCalendar;

    loadMobilityCalendarData();
}

async function loadMobilityCalendarData() {
    calMobilityDates = {};
    calMobilityDetails = {};

    if (!currentUserId || !window.db || !window.getDocs || !window.query || !window.collection || !window.where) {
        renderMobilityCalendar();
        return;
    }

    try {
        const sessionsSnapshot = await window.getDocs(window.query(
            window.collection(window.db, 'mobilitySessions'),
            window.where('userId', '==', currentUserId),
            window.where('status', '==', 'completed')
        ));

        sessionsSnapshot.forEach(docSnap => {
            const session = docSnap.data();
            if (!session.date) return;
            calMobilityDates[session.date] = true;
            if (!calMobilityDetails[session.date]) calMobilityDetails[session.date] = [];
            calMobilityDetails[session.date].push(session);
        });
    } catch (error) {
        console.error('Error loading mobility calendar data:', error);
    }

    renderMobilityCalendar();
}

function renderMobilityCalendar() {
    const monthEl = document.getElementById('mobilityCalMonth');
    const yearEl = document.getElementById('mobilityCalYear');
    const grid = document.getElementById('mobilityCalendarGrid');
    if (!monthEl || !yearEl || !grid) return;

    const month = parseInt(monthEl.value, 10);
    const year = parseInt(yearEl.value, 10);

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const start = first.getDay();
    const days = last.getDate();

    grid.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row';
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(dayName => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-cell';
        dayCell.textContent = dayName;
        dayCell.style.fontWeight = '700';
        dayCell.style.color = '#0f2540';
        dayCell.style.background = 'transparent';
        headerRow.appendChild(dayCell);
    });
    grid.appendChild(headerRow);

    let row = document.createElement('div');
    row.className = 'calendar-row';

    for (let i = 0; i < start; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell';
        emptyCell.style.background = 'transparent';
        row.appendChild(emptyCell);
    }

    for (let day = 1; day <= days; day++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (calMobilityDates[key]) {
            cell.classList.add('cal-train');
        }
        cell.textContent = day;
        cell.addEventListener('click', () => openMobilityCalendarDetail(key));
        row.appendChild(cell);

        if ((start + day) % 7 === 0) {
            grid.appendChild(row);
            row = document.createElement('div');
            row.className = 'calendar-row';
        }
    }

    if (row.children.length > 0) grid.appendChild(row);
}

function openMobilityCalendarDetail(dateStr) {
    const modal = document.getElementById('calendarDetailModal');
    const title = document.getElementById('calendarDetailTitle');
    const content = document.getElementById('calendarDetailContent');
    if (!modal || !title || !content) return;

    title.textContent = dateStr;
    const sessions = calMobilityDetails[dateStr] || [];

    if (!sessions.length) {
        content.innerHTML = '<p class="muted">No mobility sessions for this date.</p>';
        modal.classList.add('active');
        return;
    }

    let html = '<div class="calendar-detail-section"><div class="calendar-detail-title">Mobility Session Completed</div>';
    sessions.forEach(session => {
        const exercises = (session.exercises && session.exercises.length > 0)
            ? session.exercises
            : (session.items || []);
        html += `<div class="calendar-detail-item"><strong>${session.templateName || 'Untitled Template'}</strong></div>`;
        html += '<div class="calendar-detail-item" style="margin-top:0.3rem;">';
        html += exercises.map(item => `${item.name} (${item.sets} x ${item.reps || item.duration})`).join(' | ') || 'No exercise details';
        html += '</div>';
    });
    html += '</div>';

    content.innerHTML = html;
    modal.classList.add('active');
}

window.initMobilityCalendar = initMobilityCalendar;
