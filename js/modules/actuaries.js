/* Actuaries module logic extracted from index.html */
// Actuaries Module
const actuarySubjects = ['SP1', 'SP2'];
const actuaryState = {
    subject: null,
    noteId: null,
    mode: 'edit',
    lastOrder: 0
};

let actuaryUiInitialized = false;
let actuarySortable = null;
window.actuaryState = actuaryState;

function setActuaryNotesStatus(message, isError) {
    const statusEl = document.getElementById('actuaryNotesStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? '#ef4444' : 'var(--muted)';
}

function setActuaryView(viewId) {
    const homeView = document.getElementById('actuaryHomeView');
    const subjectView = document.getElementById('actuarySubjectView');
    if (homeView) homeView.style.display = viewId === 'home' ? 'block' : 'none';
    if (subjectView) subjectView.style.display = viewId === 'subject' ? 'block' : 'none';
}

window.closeActuaryNoteModal = function() {
    const modal = document.getElementById('actuaryNoteModal');
    if (modal) modal.classList.remove('active');
    actuaryState.noteId = null;
};

window.addQuestionFromHighlight = function(text) {
    if (!text) return;
    console.log('Highlight captured:', text);
};

window.initializeActuariesUI = function() {
    if (actuaryUiInitialized) return;
    const editor = document.getElementById('noteEditor');
    const viewer = document.getElementById('noteViewer');
    if (!editor || !viewer) return;

    // Add mouseup listener to both editor and viewer for question highlighting
    const addHighlightListener = (element) => {
        element.addEventListener('mouseup', () => {
            if (actuaryState.mode !== 'read') return;
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;
            const text = selection.toString().trim();
            if (!text) return;
            window.addQuestionFromHighlight(text);
        });
    };
    
    addHighlightListener(editor);
    addHighlightListener(viewer);

    actuaryUiInitialized = true;
};

window.showActuaryModules = function() {
    actuaryState.subject = null;
    actuaryState.noteId = null;
    setActuaryView('home');
};

window.showSubjectNotes = async function(subject) {
    if (!subject) return;
    actuaryState.subject = subject;
    const titleEl = document.getElementById('actuarySubjectTitle');
    if (titleEl) titleEl.textContent = `${subject} Notes`;
    setActuaryView('subject');
    await window.loadNotes();
};

window.loadNotesForSubject = async function(subject) {
    await window.showSubjectNotes(subject);
};

window.loadNotes = async function() {
    const listEl = document.getElementById('actuaryNotesList');
    if (!listEl) return;
    if (!currentUserId || !actuaryState.subject) {
        listEl.innerHTML = '<div class="muted">Sign in to view notes.</div>';
        return;
    }

    listEl.innerHTML = '<div class="muted">Loading notes...</div>';

    try {
        console.log('Loading notes for:', {
            userId: currentUserId,
            subject: actuaryState.subject
        });

        const q = query(
            collection(db, 'actuary_notes'),
            where('userId', '==', currentUserId),
            where('subject', '==', actuaryState.subject),
            orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        console.log('Notes loaded:', snapshot.size, 'documents');
        
        listEl.innerHTML = '';
        actuaryState.lastOrder = 0;

        if (snapshot.empty) {
            listEl.innerHTML = '<div class="muted">No notes yet. Create your first note.</div>';
            return;
        }

        snapshot.forEach((docSnap, index) => {
            const data = docSnap.data();
            const orderValue = typeof data.order === 'number' ? data.order : index;
            actuaryState.lastOrder = Math.max(actuaryState.lastOrder, orderValue);

            const card = document.createElement('div');
            card.className = 'actuary-note-card';
            card.setAttribute('data-note-id', docSnap.id);

            const meta = document.createElement('div');
            meta.className = 'actuary-note-meta';
            const title = document.createElement('h4');
            title.textContent = data.title || 'Untitled Note';
            const progress = document.createElement('div');
            progress.className = 'actuary-progress';
            const progressBar = document.createElement('div');
            progressBar.className = 'actuary-progress-bar';
            progress.appendChild(progressBar);
            meta.appendChild(title);
            meta.appendChild(progress);

            const actions = document.createElement('div');
            actions.className = 'card-actions';
            const editBtn = document.createElement('button');
            editBtn.className = 'submit-btn btn-sm';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                window.openNoteEditor(docSnap.id);
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'submit-btn btn-danger btn-sm';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                window.deleteNote(docSnap.id);
            });
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            card.appendChild(meta);
            card.appendChild(actions);
            card.addEventListener('click', () => window.openNoteEditor(docSnap.id));

            listEl.appendChild(card);
        });

        enableDragSorting();
    } catch (error) {
        console.error('Error loading notes:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMsg = 'Unable to load notes.';
        if (error.code === 'failed-precondition') {
            errorMsg += ' Please create a Firestore index. Check the console for the index creation link.';
        } else if (error.message) {
            errorMsg += ' ' + error.message;
        }
        
        listEl.innerHTML = `<div class="muted">${errorMsg}</div>`;
    }
};

window.openNoteEditor = async function(noteId) {
    const modal = document.getElementById('actuaryNoteModal');
    const titleInput = document.getElementById('actuaryNoteTitle');
    const editor = document.getElementById('noteEditor');
    const viewer = document.getElementById('noteViewer');
    const modeButtons = document.getElementById('actuaryModeButtons');
    if (!modal || !titleInput || !editor || !viewer) return;
    if (!currentUserId) return alert('Please sign in to view notes.');

    setActuaryNotesStatus('');
    modal.classList.add('active');

    if (noteId) {
        try {
            const noteRef = doc(db, 'actuary_notes', noteId);
            const snap = await getDoc(noteRef);
            if (!snap.exists()) {
                alert('Note not found');
                window.closeActuaryNoteModal();
                return;
            }
            const data = snap.data();
            if (data.userId !== currentUserId) {
                alert('You do not have permission to view this note.');
                window.closeActuaryNoteModal();
                return;
            }
            actuaryState.noteId = noteId;
            actuaryState.subject = data.subject;
            titleInput.value = data.title || '';
            
            // Apply highlights to content
            const contentWithHighlights = window.applyHighlights(data.content || '', data.highlights || []);
            
            editor.innerHTML = data.content || '';
            viewer.innerHTML = contentWithHighlights;
            if (modeButtons) modeButtons.style.display = 'flex';
            toggleMode('read');
        } catch (error) {
            console.error('Error loading note', error);
            alert('Error loading note: ' + error.message);
        }
    } else {
        // Creating a new note - ensure subject is set
        if (!actuaryState.subject) {
            alert('Please select a subject first by clicking on a subject card.');
            window.closeActuaryNoteModal();
            return;
        }
        actuaryState.noteId = null;
        titleInput.value = '';
        editor.innerHTML = '';
        viewer.innerHTML = '';
        if (modeButtons) modeButtons.style.display = 'none';
        toggleMode('edit');
    }
};

window.saveNote = async function() {
    const titleInput = document.getElementById('actuaryNoteTitle');
    const editor = document.getElementById('noteEditor');
    const viewer = document.getElementById('noteViewer');
    
    if (!titleInput || !editor || !viewer) {
        console.error('Save failed: Required elements not found');
        return;
    }
    if (!currentUserId) {
        console.error('Save failed: No user logged in');
        return alert('Please sign in to save notes.');
    }
    if (!actuaryState.subject) {
        console.error('Save failed: No subject set', actuaryState);
        return alert('Select a subject first.');
    }

    const title = titleInput.value.trim() || 'Untitled Note';
    
    // Get plain content (without highlight spans)
    let content;
    if (actuaryState.mode === 'edit') {
        content = editor.innerHTML.trim();
    } else {
        // If saving from read mode, strip highlights
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = viewer.innerHTML;
        tempDiv.querySelectorAll('.note-highlight').forEach(span => {
            span.replaceWith(span.textContent);
        });
        content = tempDiv.innerHTML.trim();
    }

    console.log('Saving note:', {
        noteId: actuaryState.noteId,
        subject: actuaryState.subject,
        title: title.substring(0, 30),
        contentLength: content.length
    });

    try {
        if (actuaryState.noteId) {
            console.log('Updating existing note:', actuaryState.noteId);
            
            // Get existing highlights to preserve them
            const noteRef = doc(db, 'actuary_notes', actuaryState.noteId);
            const snap = await getDoc(noteRef);
            const existingHighlights = snap.exists() ? (snap.data().highlights || []) : [];
            
            await updateDoc(noteRef, {
                title,
                content,
                highlights: existingHighlights, // Preserve existing highlights
                updatedAt: Date.now()
            });
            console.log('Note updated successfully');
        } else {
            const newOrder = (actuaryState.lastOrder || 0) + 1;
            console.log('Creating new note with order:', newOrder);
            const docRef = await addDoc(collection(db, 'actuary_notes'), {
                userId: currentUserId,
                subject: actuaryState.subject,
                title,
                content,
                order: newOrder,
                highlights: [], // Initialize empty highlights array
                createdAt: Date.now()
            });
            console.log('Note created successfully:', docRef.id);
        }
        setActuaryNotesStatus('Saved.', false);
        await window.loadNotes();
    } catch (error) {
        console.error('Error saving note', error);
        setActuaryNotesStatus('Error saving note: ' + error.message, true);
        alert('Error saving note: ' + error.message);
    }
};

window.deleteNote = async function(noteId) {
    if (!noteId) return;
    if (!confirm('Delete this note?')) return;
    try {
        const noteRef = doc(db, 'actuary_notes', noteId);
        const snap = await getDoc(noteRef);
        if (!snap.exists()) return alert('Note not found');
        const data = snap.data();
        if (data.userId !== currentUserId) return alert('You do not have permission to delete this note.');
        await deleteDoc(noteRef);
        await window.loadNotes();
    } catch (error) {
        console.error('Error deleting note', error);
        alert('Error deleting note: ' + error.message);
    }
};

window.enableDragSorting = function() {
    const listEl = document.getElementById('actuaryNotesList');
    if (!listEl || typeof Sortable === 'undefined') return;
    if (actuarySortable) {
        actuarySortable.destroy();
        actuarySortable = null;
    }

    actuarySortable = Sortable.create(listEl, {
        animation: 150,
        onStart: (evt) => evt.item.classList.add('dragging'),
        onEnd: async (evt) => {
            evt.item.classList.remove('dragging');
            await updateOrderInFirestore();
        }
    });
};

window.updateOrderInFirestore = async function() {
    const listEl = document.getElementById('actuaryNotesList');
    if (!listEl) return;
    const cards = Array.from(listEl.querySelectorAll('.actuary-note-card'));
    if (cards.length === 0) return;

    const updates = cards.map((card, index) => {
        const noteId = card.getAttribute('data-note-id');
        return updateDoc(doc(db, 'actuary_notes', noteId), { order: index + 1 });
    });

    try {
        await Promise.all(updates);
    } catch (error) {
        console.error('Error updating order', error);
    }
};

let currentFontSize = 17;
let selectedRange = null;
let currentHighlightSelection = null;

// Text Selection Detection for Highlighting (Read Mode Only)
document.addEventListener('mouseup', function(e) {
    const viewer = document.getElementById('noteViewer');
    const popup = document.getElementById('highlightCommentPopup');
    
    if (!viewer || viewer.style.display === 'none') {
        if (popup) popup.style.display = 'none';
        return;
    }
    
    // Don't show popup if clicking inside the popup itself
    if (popup && popup.contains(e.target)) return;
    
    // Don't show popup if clicking on existing highlight
    if (e.target.classList.contains('note-highlight')) {
        popup.style.display = 'none';
        return;
    }
    
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim().length > 0) {
        // Check if selection is within viewer
        const range = selection.getRangeAt(0);
        if (!viewer.contains(range.commonAncestorContainer)) {
            popup.style.display = 'none';
            return;
        }
        
        selectedRange = range;
        currentHighlightSelection = selection.toString().trim();
        
        const rect = range.getBoundingClientRect();
        popup.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 280) + 'px';
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.display = 'block';
        
        // Focus the textarea
        setTimeout(() => {
            document.getElementById('highlightQuestionInput')?.focus();
        }, 50);
    } else {
        popup.style.display = 'none';
    }
});

// Hide popup when clicking outside
document.addEventListener('mousedown', function(e) {
    const popup = document.getElementById('highlightCommentPopup');
    if (popup && popup.style.display === 'block' && !popup.contains(e.target)) {
        // Check if not clicking within noteViewer text
        const viewer = document.getElementById('noteViewer');
        if (!viewer || !viewer.contains(e.target)) {
            popup.style.display = 'none';
        }
    }
});

// Click on highlight to show question
let currentHighlightElement = null;
let currentLearnId = null;
let currentLearnSubject = 'SP1';

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('note-highlight')) {
        const question = e.target.getAttribute('data-question');
        if (question) {
            currentHighlightElement = e.target;
            showHighlightQuestion(question);
        }
    }
});

window.getSelectedHtml = function() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return '';
    
    const container = document.createElement('div');
    container.appendChild(selection.getRangeAt(0).cloneContents());
    
    return container.innerHTML;
};

window.showHighlightQuestion = function(question) {
    const modal = document.getElementById('highlightQuestionModal');
    const textDiv = document.getElementById('highlightQuestionText');
    if (modal && textDiv) {
        textDiv.textContent = question;
        modal.style.display = 'flex';
    }
};

window.closeHighlightModal = function() {
    const modal = document.getElementById('highlightQuestionModal');
    if (modal) modal.style.display = 'none';
    currentHighlightElement = null;
};

window.deleteQuestion = async function() {
    if (!currentHighlightElement) return;
    if (!confirm('Delete this question?')) return;

    try {
        const textNode = document.createTextNode(currentHighlightElement.textContent || '');
        currentHighlightElement.replaceWith(textNode);
        await saveHighlightsToFirestore();
        window.closeHighlightModal();
    } catch (error) {
        console.error('Error deleting highlight:', error);
        alert('Error deleting highlight: ' + error.message);
    }
};

window.addHighlightToLearn = async function() {
    const question = document.getElementById('highlightQuestionText')?.textContent;

    if (!question || !currentHighlightElement) return;

    if (!currentUserId || !actuaryState.noteId) {
        alert('Please sign in and open a note first.');
        return;
    }

    try {
        const questionText = question;
        const answerHtml = currentHighlightElement.innerHTML || '';

        await addDoc(collection(db, 'actuary_questions'), {
            userId: currentUserId,
            noteId: actuaryState.noteId,
            question: questionText,
            answer: answerHtml,
            createdAt: Date.now()
        });

        alert('âœ… Added to Learn cards!');
        window.closeHighlightModal();

    } catch (error) {
        console.error('Error adding to learn:', error);
        alert('Error adding: ' + error.message);
    }
};

window.cancelHighlight = function() {
    const popup = document.getElementById('highlightCommentPopup');
    if (popup) popup.style.display = 'none';
    document.getElementById('highlightQuestionInput').value = '';
    selectedRange = null;
    currentHighlightSelection = null;
};

window.saveHighlightComment = async function() {
    const question = document.getElementById('highlightQuestionInput').value.trim();
    const popup = document.getElementById('highlightCommentPopup');
    
    if (!question || !selectedRange) return;
    
    try {
        const span = document.createElement('span');
        span.className = 'note-highlight';
        span.setAttribute('data-question', question);
        
        // Use extractContents + insertNode for complex selections
        // This works across multiple DOM nodes (lists, paragraphs, headings)
        const extracted = selectedRange.extractContents();
        span.appendChild(extracted);
        selectedRange.insertNode(span);
        
        popup.style.display = 'none';
        document.getElementById('highlightQuestionInput').value = '';
        
        // Save to Firestore
        await saveHighlightsToFirestore();
        
        // Clear selection
        window.getSelection()?.removeAllRanges();
        selectedRange = null;
        currentHighlightSelection = null;
    } catch (error) {
        console.error('Error adding highlight:', error);
        alert('Could not add highlight. Please try again or select a different text range.');
    }
};

window.saveHighlightsToFirestore = async function() {
    if (!actuaryState.noteId) return;
    
    const viewer = document.getElementById('noteViewer');
    if (!viewer) return;
    
    const highlights = Array.from(viewer.querySelectorAll('.note-highlight')).map(el => ({
        text: el.innerText,
        question: el.getAttribute('data-question')
    }));
    
    try {
        const docRef = doc(db, 'actuary_notes', actuaryState.noteId);
        await updateDoc(docRef, {
            highlights: highlights
        });
        console.log('Highlights saved:', highlights.length);
    } catch (error) {
        console.error('Error saving highlights:', error);
    }
};

window.applyHighlights = function(content, highlights) {
    if (!highlights || highlights.length === 0) return content;
    
    let result = content;
    highlights.forEach(h => {
        if (h.text && h.question) {
            const highlightedHTML = `<span class="note-highlight" data-question="${h.question.replace(/"/g, '&quot;')}">${h.text}</span>`;
            // Replace first occurrence only to avoid nested replacements
            result = result.replace(h.text, highlightedHTML);
        }
    });
    
    return result;
};

window.adjustFontSize = function(delta) {
    currentFontSize = Math.max(12, Math.min(24, currentFontSize + delta));
    const editor = document.getElementById('noteEditor');
    const viewer = document.getElementById('noteViewer');
    if (editor) editor.style.fontSize = currentFontSize + 'px';
    if (viewer) viewer.style.fontSize = currentFontSize + 'px';
};

window.toggleMode = function(mode) {
    const editor = document.getElementById('noteEditor');
    const viewer = document.getElementById('noteViewer');
    const readBtn = document.getElementById('actuaryReadModeBtn');
    const editBtn = document.getElementById('actuaryEditModeBtn');
    const popup = document.getElementById('highlightCommentPopup');
    if (!editor || !viewer) return;
    
    actuaryState.mode = mode;
    const isRead = mode === 'read';
    
    // Hide highlight popup when switching modes
    if (popup) popup.style.display = 'none';
    
    // Sync content between editor and viewer
    if (isRead) {
        // When switching to read mode, preserve highlights if they exist
        if (viewer.innerHTML && viewer.querySelector('.note-highlight')) {
            // Keep viewer as is (has highlights)
        } else {
            viewer.innerHTML = editor.innerHTML;
        }
        editor.style.display = 'none';
        viewer.style.display = 'block';
    } else {
        // When switching to edit mode, use plain content without highlights
        editor.innerHTML = viewer.innerHTML.replace(/<span class="note-highlight"[^>]*>(.*?)<\/span>/g, '$1');
        editor.style.display = 'block';
        viewer.style.display = 'none';
    }
    
    if (readBtn) readBtn.classList.toggle('active', isRead);
    if (editBtn) editBtn.classList.toggle('active', !isRead);
};

window.loadLearnQuestions = async function(subjectOverride) {
    const listEl = document.getElementById('actuaryLearnList');
    const subjectSelect = document.getElementById('actuaryLearnSubject');
    if (!listEl || !subjectSelect) return;
    if (!currentUserId) {
        listEl.innerHTML = '<div class="muted">Sign in to view questions.</div>';
        return;
    }

    if (subjectSelect.options.length === 0) {
        subjectSelect.innerHTML = actuarySubjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');
    }

    const subject = subjectOverride || subjectSelect.value || actuarySubjects[0];
    subjectSelect.value = subject;
    currentLearnSubject = subject;

    try {
        const learnSnap = await getDocs(query(
            collection(db, 'actuary_learn'),
            where('userId', '==', currentUserId),
            where('subject', '==', subject),
            orderBy('createdAt', 'desc')
        ));

        if (learnSnap.empty) {
            listEl.innerHTML = '<div class="muted">No learn items yet for this subject.</div>';
            return;
        }

        listEl.innerHTML = '';
        learnSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'actuary-learn-card';
            
            const title = document.createElement('h4');
            title.textContent = data.question || 'Question';
            
            const answer = document.createElement('div');
            answer.className = 'actuary-learn-answer';
            answer.innerHTML = data.extractHtml || '';
            answer.style.display = 'none';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;';
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'submit-btn btn-sm';
            toggleBtn.textContent = 'Show Answer';
            toggleBtn.addEventListener('click', () => {
                const isVisible = answer.style.display === 'block';
                answer.style.display = isVisible ? 'none' : 'block';
                toggleBtn.textContent = isVisible ? 'Show Answer' : 'Hide Answer';
            });
            
            const editBtn = document.createElement('button');
            editBtn.className = 'submit-btn btn-sm';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                openLearnEditor(docSnap.id, data);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'submit-btn btn-danger btn-sm';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => {
                deleteLearnItem(docSnap.id);
            });
            
            btnContainer.appendChild(toggleBtn);
            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(deleteBtn);
            
            card.appendChild(title);
            card.appendChild(btnContainer);
            card.appendChild(answer);
            listEl.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading learn questions:', error);
        listEl.innerHTML = '<div class="muted">Unable to load questions.</div>';
    }
};

window.openLearnEditor = function(learnId, data) {
    currentLearnId = learnId;
    const modal = document.getElementById('learnEditorModal');
    const questionInput = document.getElementById('learnQuestionInput');
    const extractEditor = document.getElementById('learnExtractEditor');
    
    if (modal && questionInput && extractEditor) {
        questionInput.value = data.question || '';
        extractEditor.innerHTML = data.extractHtml || '';
        modal.style.display = 'flex';
    }
};

window.closeLearnEditor = function() {
    const modal = document.getElementById('learnEditorModal');
    if (modal) modal.style.display = 'none';
    currentLearnId = null;
};

window.saveLearnEdit = async function() {
    if (!currentLearnId) return;
    
    const question = document.getElementById('learnQuestionInput').value.trim();
    const extractHtml = document.getElementById('learnExtractEditor').innerHTML.trim();
    
    if (!question) {
        alert('Please enter a question');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'actuary_learn', currentLearnId), {
            question: question,
            extractHtml: extractHtml,
            updatedAt: Date.now()
        });
        
        closeLearnEditor();
        await loadLearnQuestions(currentLearnSubject);
        alert('âœ… Saved successfully!');
    } catch (error) {
        console.error('Error saving learn item:', error);
        alert('Error saving: ' + error.message);
    }
};

window.deleteCurrentLearn = async function() {
    if (!currentLearnId) return;
    
    if (!confirm('Delete this learn item?')) return;
    
    try {
        await deleteDoc(doc(db, 'actuary_learn', currentLearnId));
        closeLearnEditor();
        await loadLearnQuestions(currentLearnSubject);
    } catch (error) {
        console.error('Error deleting learn item:', error);
        alert('Error deleting: ' + error.message);
    }
};

window.deleteLearnItem = async function(learnId) {
    if (!learnId) return;
    
    if (!confirm('Delete this learn item?')) return;
    
    try {
        await deleteDoc(doc(db, 'actuary_learn', learnId));
        await loadLearnQuestions(currentLearnSubject);
    } catch (error) {
        console.error('Error deleting learn item:', error);
        alert('Error deleting: ' + error.message);
    }
};

let learnModalOpen = false;
let cardsArray = [];
let currentCardIndex = 0;
let cardFontSize = 18;

window.applyCardFontSize = function() {
    document.querySelectorAll('.card-textarea').forEach(el => {
        el.style.fontSize = cardFontSize + 'px';
    });
};

window.increaseCardFont = function() {
    cardFontSize += 1;
    applyCardFontSize();
};

window.decreaseCardFont = function() {
    cardFontSize = Math.max(14, cardFontSize - 1);
    applyCardFontSize();
};

function setCardControlsDisabled(disabled) {
    const editBtn = document.getElementById('editCardBtn');
    const deleteBtn = document.getElementById('deleteCardBtn');
    const saveBtn = document.getElementById('saveCardBtn');
    const toggleBtn = document.getElementById('toggleAnswerBtn');
    const prevBtn = document.querySelector('#learnModal .learn-modal-footer button[onclick="prevCard()"]');
    const nextBtn = document.querySelector('#learnModal .learn-modal-footer button[onclick="nextCard()"]');

    [editBtn, deleteBtn, saveBtn, toggleBtn, prevBtn, nextBtn].forEach(btn => {
        if (btn) btn.disabled = !!disabled;
    });
}

window.openLearnModal = async function() {
    if (!currentUserId || !actuaryState.noteId) {
        alert('Please sign in and open a note first.');
        return;
    }
    const modal = document.getElementById('learnModal');
    if (!modal) return;
    modal.style.display = 'flex';
    learnModalOpen = true;
    await loadCardsForNote();
};

window.closeLearnModal = function() {
    const modal = document.getElementById('learnModal');
    if (modal) modal.style.display = 'none';
    learnModalOpen = false;
};

window.loadCardsForNote = async function() {
    const statusEl = document.getElementById('learnStatus');
    if (statusEl) statusEl.textContent = 'Loading...';

    cardsArray = [];
    console.log('Loading cards for:');
    console.log('User:', currentUserId);
    console.log('Note:', actuaryState.noteId);

    if (!actuaryState.noteId) {
        if (statusEl) statusEl.textContent = 'No note selected.';
        renderCard();
        return;
    }

    try {
        const q = query(
            collection(db, 'actuary_questions'),
            where('userId', '==', currentUserId),
            where('noteId', '==', actuaryState.noteId)
        );
        const snapshot = await getDocs(q);
        console.log('Cards found:', snapshot.size);
        cardsArray = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        currentCardIndex = 0;
        renderCard();
        if (statusEl) {
            statusEl.textContent = cardsArray.length ? '' : 'No cards yet for this note.';
        }
    } catch (error) {
        console.error('Error loading cards:', error);
        if (statusEl) statusEl.textContent = 'Failed to load cards.';
    }
};

window.renderCard = function() {
    const counterEl = document.getElementById('cardCounter');
    const questionDisplay = document.getElementById('cardQuestionDisplay');
    const questionEdit = document.getElementById('cardQuestionEdit');
    const answerDisplay = document.getElementById('cardAnswerDisplay');
    const answerEdit = document.getElementById('cardAnswerEdit');
    const answerSection = document.getElementById('answerSection');
    const toggleBtn = document.getElementById('toggleAnswerBtn');
    const editBtn = document.getElementById('editCardBtn');
    const saveBtn = document.getElementById('saveCardBtn');
    const deleteBtn = document.getElementById('deleteCardBtn');
    const bodyEl = document.getElementById('learnCardBody');

    if (!counterEl || !questionDisplay || !questionEdit || !answerDisplay || !answerEdit || !answerSection) return;

    if (!cardsArray.length) {
        counterEl.textContent = 'Card 0 of 0';
        questionDisplay.textContent = 'No cards yet for this note.';
        questionEdit.value = '';
        answerDisplay.textContent = '';
        answerEdit.value = '';
        answerSection.style.display = 'none';
        if (toggleBtn) toggleBtn.textContent = 'Show Answer';
        if (editBtn) editBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.style.display = 'none';
        setCardEditMode(false);
        setCardControlsDisabled(true);
        return;
    }

    const card = cardsArray[currentCardIndex];
    counterEl.textContent = `Card ${currentCardIndex + 1} of ${cardsArray.length}`;
    questionDisplay.textContent = card.question || '';
    questionEdit.value = card.question || '';
    answerDisplay.innerHTML = card.answer || '';
    answerEdit.value = card.answer || '';
    answerSection.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'Show Answer';
    if (editBtn) editBtn.style.display = 'inline-block';
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
    if (saveBtn) saveBtn.style.display = 'none';
    setCardEditMode(false);
    setCardControlsDisabled(false);

    applyCardFontSize();

    if (bodyEl) {
        bodyEl.style.opacity = '0';
        requestAnimationFrame(() => {
            bodyEl.style.opacity = '1';
        });
    }
};

window.toggleAnswer = function() {
    const answerSection = document.getElementById('answerSection');
    const toggleBtn = document.getElementById('toggleAnswerBtn');
    if (!answerSection || !toggleBtn) return;
    const isVisible = answerSection.style.display === 'block';
    answerSection.style.display = isVisible ? 'none' : 'block';
    toggleBtn.textContent = isVisible ? 'Show Answer' : 'Hide Answer';
};

window.nextCard = function() {
    if (currentCardIndex < cardsArray.length - 1) {
        currentCardIndex += 1;
        renderCard();
    }
};

window.prevCard = function() {
    if (currentCardIndex > 0) {
        currentCardIndex -= 1;
        renderCard();
    }
};

window.enableCardEdit = function() {
    const questionEdit = document.getElementById('cardQuestionEdit');
    const answerEdit = document.getElementById('cardAnswerEdit');
    const saveBtn = document.getElementById('saveCardBtn');
    const editBtn = document.getElementById('editCardBtn');
    if (!questionEdit || !answerEdit) return;

    setCardEditMode(true);
    if (saveBtn) saveBtn.style.display = 'inline-block';
    if (editBtn) editBtn.style.display = 'none';
};

window.saveCardEdit = async function() {
    const card = cardsArray[currentCardIndex];
    if (!card) return;

    const questionEdit = document.getElementById('cardQuestionEdit');
    const answerEdit = document.getElementById('cardAnswerEdit');
    const saveBtn = document.getElementById('saveCardBtn');
    const editBtn = document.getElementById('editCardBtn');
    const statusEl = document.getElementById('learnStatus');

    try {
        await updateDoc(doc(db, 'actuary_questions', card.id), {
            question: questionEdit.value.trim(),
            answer: answerEdit.value.trim()
        });
        cardsArray[currentCardIndex] = {
            ...card,
            question: questionEdit.value.trim(),
            answer: answerEdit.value.trim()
        };
        setCardEditMode(false);
        if (saveBtn) saveBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'inline-block';
        if (statusEl) statusEl.textContent = 'Saved.';
    } catch (error) {
        console.error('Error updating card:', error);
        if (statusEl) statusEl.textContent = 'Save failed.';
    }
};

function setCardEditMode(isEdit) {
    const questionDisplay = document.getElementById('cardQuestionDisplay');
    const questionEdit = document.getElementById('cardQuestionEdit');
    const answerDisplay = document.getElementById('cardAnswerDisplay');
    const answerEdit = document.getElementById('cardAnswerEdit');

    if (!questionDisplay || !questionEdit || !answerDisplay || !answerEdit) return;

    questionDisplay.style.display = isEdit ? 'none' : 'block';
    questionEdit.style.display = isEdit ? 'block' : 'none';
    answerDisplay.style.display = isEdit ? 'none' : 'block';
    answerEdit.style.display = isEdit ? 'block' : 'none';
}

window.deleteCard = async function() {
    const card = cardsArray[currentCardIndex];
    const statusEl = document.getElementById('learnStatus');
    if (!card) return;

    if (!confirm('Delete this card permanently?')) return;

    try {
        await deleteDoc(doc(db, 'actuary_questions', card.id));
        cardsArray.splice(currentCardIndex, 1);

        if (!cardsArray.length) {
            if (statusEl) statusEl.textContent = 'Card deleted.';
            closeLearnModal();
            alert('Card deleted');
            return;
        }

        if (currentCardIndex >= cardsArray.length) {
            currentCardIndex = cardsArray.length - 1;
        }
        renderCard();
        if (statusEl) statusEl.textContent = 'Card deleted.';
    } catch (error) {
        console.error('Error deleting card:', error);
        if (statusEl) statusEl.textContent = 'Delete failed.';
    }
}

document.addEventListener('keydown', (e) => {
    if (!learnModalOpen) return;
    const activeTag = document.activeElement?.tagName || '';
    const isEditable = ['INPUT', 'TEXTAREA'].includes(activeTag) && !document.activeElement.readOnly;
    if (isEditable) return;

    if (e.key === 'ArrowRight') {
        nextCard();
    } else if (e.key === 'ArrowLeft') {
        prevCard();
    } else if (e.code === 'Space') {
        e.preventDefault();
        toggleAnswer();
    }
});

// TEST FUNCTIONS
window.saveSession = async function(session){
    await addDoc(collection(db,"sessions"), session);
    console.log("Saved:", session);
}

window.loadSessions = async function(){
    const snapshot = await getDocs(collection(db,"sessions"));
    snapshot.forEach(doc => console.log(doc.data()));
}
