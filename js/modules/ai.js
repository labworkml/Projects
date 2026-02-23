/* AI / ML / DS module logic */
let aiStudySessionsCache = [];
let aiStudyHistoryCache = [];
let aiCoursesCache = [];
let aiBooksCache = [];
let aiStudyEditingSessionId = null;
let aiStudyEditingJournalId = null;
let aiStudyEditingCourseId = null;
let aiStudyEditingBookId = null;
let aiCalendarPlannedDates = {};
let aiCalendarHistoryDates = {};
let aiCalendarPlannedDetails = {};
let aiCalendarHistoryDetails = {};

function aiStudyEscapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function aiStudyEnsureFirebaseReady() {
	if (!window.db || !window.collection || !window.addDoc || !window.updateDoc || !window.deleteDoc || !window.getDocs || !window.query || !window.where) {
		alert('Firebase is not ready yet. Please wait a moment and try again.');
		return false;
	}
	const uid = aiStudyGetActiveUserId();
	if (!uid) {
		alert('Please sign in again to save data.');
		return false;
	}
	return true;
}

function aiStudyGetActiveUserId() {
	const authUid = window.firebaseAuth?.currentUser?.uid || '';
	return authUid || currentUserId || '';
}

function aiStudyGetToday() {
	return new Date().toISOString().split('T')[0];
}

function aiStudySetDefaultDates() {
	const dateIds = ['aiStudyDate', 'aiJournalDate'];
	dateIds.forEach(id => {
		const el = document.getElementById(id);
		if (el && !el.value) el.value = aiStudyGetToday();
	});
}

function aiStudyToggleHomePlanner(showPlanner = false) {
	const welcomeSection = document.getElementById('aiHomeWelcomeSection');
	const plannerSection = document.getElementById('aiHomePlannerSection');
	if (!welcomeSection || !plannerSection) return;

	if (showPlanner) {
		welcomeSection.style.display = 'none';
		plannerSection.style.display = 'block';
	} else {
		welcomeSection.style.display = 'block';
		plannerSection.style.display = 'none';
	}
}

window.showAIStudyPlanner = function(showPlanner = true) {
	aiStudyToggleHomePlanner(showPlanner !== false);
	if (showPlanner !== false) {
		setTimeout(() => {
			document.getElementById('aiStudyDate')?.focus();
		}, 20);
	}
};

function aiStudyPopulateDropdowns() {
	const courseEl = document.getElementById('aiStudyCourse');
	const bookEl = document.getElementById('aiStudyBook');
	if (!courseEl || !bookEl) return;

	const currentCourse = courseEl.value;
	const currentBook = bookEl.value;

	courseEl.innerHTML = '<option value="">Select course...</option>';
	aiCoursesCache.forEach(item => {
		const option = document.createElement('option');
		option.value = item.name;
		option.textContent = item.name;
		courseEl.appendChild(option);
	});

	bookEl.innerHTML = '<option value="">Select book...</option>';
	aiBooksCache.forEach(item => {
		const option = document.createElement('option');
		option.value = item.name;
		option.textContent = item.name;
		bookEl.appendChild(option);
	});

	if (currentCourse && aiCoursesCache.some(item => item.name === currentCourse)) {
		courseEl.value = currentCourse;
	}
	if (currentBook && aiBooksCache.some(item => item.name === currentBook)) {
		bookEl.value = currentBook;
	}
}

window.loadAICourses = async function() {
	const listEl = document.getElementById('aiCoursesList');
	const uid = aiStudyGetActiveUserId();
	if (!uid) {
		if (listEl) listEl.innerHTML = '<li style="color:#666;padding:1rem;">Sign in to load courses.</li>';
		return [];
	}
	if (!window.db || !window.collection || !window.getDocs || !window.query || !window.where) {
		if (listEl) listEl.innerHTML = '<li style="color:#666;padding:1rem;">Firebase is loading. Try again in a moment.</li>';
		return [];
	}

	const snapshot = await window.getDocs(window.query(
		window.collection(window.db, 'aiCourses'),
		window.where('userId', '==', uid)
	));

	aiCoursesCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
	aiCoursesCache.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

	if (listEl) {
		if (!aiCoursesCache.length) {
			listEl.innerHTML = '<li style="color:#666;padding:1rem;">No courses added yet.</li>';
		} else {
			listEl.innerHTML = aiCoursesCache.map(item => `
				<li>
					<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.7rem;flex-wrap:wrap;">
						<div style="flex:1;min-width:0;">
							<strong>${aiStudyEscapeHtml(item.name || '-')}</strong>
							<div style="margin-top:0.3rem;color:var(--muted);">Provider: ${aiStudyEscapeHtml(item.provider || '-')}</div>
							<div style="margin-top:0.15rem;color:var(--muted);">Modules: ${aiStudyEscapeHtml(item.modules || '-')}</div>
						</div>
						<div class="card-actions">
							<button class="submit-btn btn-sm" onclick="openAICourseModal('${item.id}')">Edit</button>
							<button class="submit-btn btn-danger btn-sm" onclick="deleteAICourse('${item.id}')">Delete</button>
						</div>
					</div>
				</li>
			`).join('');
		}
	}

	aiStudyPopulateDropdowns();
	return aiCoursesCache;
};

window.loadAIBooks = async function() {
	const listEl = document.getElementById('aiBooksList');
	const uid = aiStudyGetActiveUserId();
	if (!uid) {
		if (listEl) listEl.innerHTML = '<li style="color:#666;padding:1rem;">Sign in to load books.</li>';
		return [];
	}
	if (!window.db || !window.collection || !window.getDocs || !window.query || !window.where) {
		if (listEl) listEl.innerHTML = '<li style="color:#666;padding:1rem;">Firebase is loading. Try again in a moment.</li>';
		return [];
	}

	const snapshot = await window.getDocs(window.query(
		window.collection(window.db, 'aiBooks'),
		window.where('userId', '==', uid)
	));

	aiBooksCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
	aiBooksCache.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

	if (listEl) {
		if (!aiBooksCache.length) {
			listEl.innerHTML = '<li style="color:#666;padding:1rem;">No books added yet.</li>';
		} else {
			listEl.innerHTML = aiBooksCache.map(item => `
				<li>
					<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.7rem;flex-wrap:wrap;">
						<div style="flex:1;min-width:0;">
							<strong>${aiStudyEscapeHtml(item.name || '-')}</strong>
							<div style="margin-top:0.3rem;color:var(--muted);">Author: ${aiStudyEscapeHtml(item.author || '-')}</div>
						</div>
						<div class="card-actions">
							<button class="submit-btn btn-sm" onclick="openAIBookModal('${item.id}')">Edit</button>
							<button class="submit-btn btn-danger btn-sm" onclick="deleteAIBook('${item.id}')">Delete</button>
						</div>
					</div>
				</li>
			`).join('');
		}
	}

	aiStudyPopulateDropdowns();
	return aiBooksCache;
};

window.openAICourseModal = function(id = null) {
	const modal = document.getElementById('aiCourseModal');
	const titleEl = document.getElementById('aiCourseModalTitle');
	const saveBtn = document.getElementById('aiCourseSaveBtn');
	const nameEl = document.getElementById('aiCourseNameInput');
	const providerEl = document.getElementById('aiCourseProviderInput');
	const modulesEl = document.getElementById('aiCourseModulesInput');
	if (!modal || !nameEl || !providerEl || !modulesEl) return;

	aiStudyEditingCourseId = id || null;
	if (aiStudyEditingCourseId) {
		const item = aiCoursesCache.find(entry => entry.id === aiStudyEditingCourseId);
		if (!item) return;
		if (titleEl) titleEl.textContent = 'Edit Course';
		if (saveBtn) saveBtn.textContent = 'Update Course';
		nameEl.value = item.name || '';
		providerEl.value = item.provider || '';
		modulesEl.value = item.modules || '';
	} else {
		if (titleEl) titleEl.textContent = 'Add Course';
		if (saveBtn) saveBtn.textContent = 'Save Course';
		nameEl.value = '';
		providerEl.value = '';
		modulesEl.value = '';
	}

	modal.style.display = 'flex';
	setTimeout(() => nameEl.focus(), 20);
};

window.closeAICourseModal = function() {
	const modal = document.getElementById('aiCourseModal');
	if (modal) modal.style.display = 'none';
	aiStudyEditingCourseId = null;
};

window.saveAICourse = async function() {
	if (!aiStudyEnsureFirebaseReady()) return;
	const uid = aiStudyGetActiveUserId();
	const name = document.getElementById('aiCourseNameInput')?.value.trim() || '';
	const provider = document.getElementById('aiCourseProviderInput')?.value.trim() || '';
	const modules = document.getElementById('aiCourseModulesInput')?.value.trim() || '';

	if (!name) return alert('Please enter the course name.');
	if (!provider) return alert('Please enter the course provider.');
	if (!modules) return alert('Please enter course modules.');

	const payload = {
		name,
		provider,
		modules,
		createdAt: Date.now(),
		userId: uid
	};

	console.log('Saving aiCourses doc with uid:', uid, 'authUid:', window.firebaseAuth?.currentUser?.uid || null);

	try {
		if (aiStudyEditingCourseId) {
			await window.updateDoc(window.doc(window.db, 'aiCourses', aiStudyEditingCourseId), {
				name,
				provider,
				modules
			});
		} else {
			await window.addDoc(window.collection(window.db, 'aiCourses'), payload);
		}

		window.closeAICourseModal();
		await loadAICourses();
	} catch (error) {
		console.error('Error saving AI course:', error);
		alert('Could not save course to Firebase: ' + (error?.message || 'Unknown error'));
	}
};

window.openAIBookModal = function(id = null) {
	const modal = document.getElementById('aiBookModal');
	const titleEl = document.getElementById('aiBookModalTitle');
	const saveBtn = document.getElementById('aiBookSaveBtn');
	const nameEl = document.getElementById('aiBookNameInput');
	const authorEl = document.getElementById('aiBookAuthorInput');
	if (!modal || !nameEl || !authorEl) return;

	aiStudyEditingBookId = id || null;
	if (aiStudyEditingBookId) {
		const item = aiBooksCache.find(entry => entry.id === aiStudyEditingBookId);
		if (!item) return;
		if (titleEl) titleEl.textContent = 'Edit Book';
		if (saveBtn) saveBtn.textContent = 'Update Book';
		nameEl.value = item.name || '';
		authorEl.value = item.author || '';
	} else {
		if (titleEl) titleEl.textContent = 'Add Book';
		if (saveBtn) saveBtn.textContent = 'Save Book';
		nameEl.value = '';
		authorEl.value = '';
	}

	modal.style.display = 'flex';
	setTimeout(() => nameEl.focus(), 20);
};

window.closeAIBookModal = function() {
	const modal = document.getElementById('aiBookModal');
	if (modal) modal.style.display = 'none';
	aiStudyEditingBookId = null;
};

window.saveAIBook = async function() {
	if (!aiStudyEnsureFirebaseReady()) return;
	const uid = aiStudyGetActiveUserId();
	const name = document.getElementById('aiBookNameInput')?.value.trim() || '';
	const author = document.getElementById('aiBookAuthorInput')?.value.trim() || '';
	if (!name) return alert('Please enter the book name.');
	if (!author) return alert('Please enter the author name.');

	const payload = {
		name,
		author,
		createdAt: Date.now(),
		userId: uid
	};

	console.log('Saving aiBooks doc with uid:', uid, 'authUid:', window.firebaseAuth?.currentUser?.uid || null);

	try {
		if (aiStudyEditingBookId) {
			await window.updateDoc(window.doc(window.db, 'aiBooks', aiStudyEditingBookId), {
				name,
				author
			});
		} else {
			await window.addDoc(window.collection(window.db, 'aiBooks'), payload);
		}

		window.closeAIBookModal();
		await loadAIBooks();
	} catch (error) {
		console.error('Error saving AI book:', error);
		alert('Could not save book to Firebase: ' + (error?.message || 'Unknown error'));
	}
};

window.deleteAICourse = async function(id) {
	if (!confirm('Delete this course?')) return;
	if (!aiStudyEnsureFirebaseReady()) return;
	try {
		await window.deleteDoc(window.doc(window.db, 'aiCourses', id));
		await loadAICourses();
	} catch (error) {
		console.error('Error deleting AI course:', error);
		alert('Could not delete course from Firebase: ' + (error?.message || 'Unknown error'));
	}
};

window.deleteAIBook = async function(id) {
	if (!confirm('Delete this book?')) return;
	if (!aiStudyEnsureFirebaseReady()) return;
	try {
		await window.deleteDoc(window.doc(window.db, 'aiBooks', id));
		await loadAIBooks();
	} catch (error) {
		console.error('Error deleting AI book:', error);
		alert('Could not delete book from Firebase: ' + (error?.message || 'Unknown error'));
	}
};

window.saveAIStudySession = async function() {
	const date = document.getElementById('aiStudyDate')?.value || '';
	const course = document.getElementById('aiStudyCourse')?.value || '';
	const book = document.getElementById('aiStudyBook')?.value || '';
	const topic = document.getElementById('aiStudyTopic')?.value.trim() || '';
	const durationRaw = document.getElementById('aiStudyDuration')?.value || '';
	const duration = durationRaw ? Number(durationRaw) : null;

	if (!date) return alert('Please select a date.');
	if (!course) return alert('Please select a course.');
	if (!book) return alert('Please select a book.');
	if (durationRaw && (!Number.isFinite(duration) || duration <= 0)) return alert('Duration should be a positive number.');

	const payload = {
		date,
		course,
		book,
		topic,
		duration: duration || null,
		status: 'planned',
		createdAt: Date.now(),
		userId: currentUserId
	};

	if (aiStudyEditingSessionId) {
		const target = aiStudySessionsCache.find(session => session.id === aiStudyEditingSessionId);
		if (target && target.status) payload.status = target.status;
		await updateDoc(doc(db, 'aiStudySessions', aiStudyEditingSessionId), payload);
	} else {
		await addDoc(collection(db, 'aiStudySessions'), payload);
	}

	aiStudyEditingSessionId = null;
	const form = document.getElementById('aiStudyForm');
	if (form) form.reset();
	aiStudySetDefaultDates();
	const finalizeBtn = document.getElementById('aiStudyFinalizeBtn');
	if (finalizeBtn) finalizeBtn.textContent = 'Finalize Session';

	await loadAIStudySessions();
	await loadAIStudyHistory();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();

	const btn = Array.from(document.querySelectorAll('.tab-button')).find(button => button.dataset.tab === 'aiSessions');
	switchTab('aiSessions', btn || null);
};

window.loadAIStudySessions = async function() {
	const listEl = document.getElementById('aiSessionsList');
	if (!listEl || !currentUserId) return [];

	const snapshot = await getDocs(query(
		collection(db, 'aiStudySessions'),
		where('userId', '==', currentUserId)
	));

	aiStudySessionsCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
	aiStudySessionsCache.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

	const planned = aiStudySessionsCache.filter(item => (item.status || 'planned') !== 'completed');

	if (!planned.length) {
		listEl.innerHTML = '<li style="color:#666;padding:1rem;">No planned study sessions.</li>';
		return aiStudySessionsCache;
	}

	listEl.innerHTML = planned.map(item => `
		<li>
			<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.8rem;flex-wrap:wrap;">
				<div style="flex:1;min-width:0;">
					<strong>${aiStudyEscapeHtml(item.date || '')}</strong>
					<div style="margin-top:0.35rem;color:var(--muted);">Course: ${aiStudyEscapeHtml(item.course || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Book: ${aiStudyEscapeHtml(item.book || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Topic: ${aiStudyEscapeHtml(item.topic || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Duration: ${item.duration ? `${item.duration} min` : '-'}</div>
				</div>
				<div class="card-actions">
					<button class="submit-btn btn-sm" onclick="startAIStudySession('${item.id}')">Start Session</button>
					<button class="submit-btn btn-sm" onclick="editAIStudySession('${item.id}')">Edit</button>
					<button class="submit-btn btn-danger btn-sm" onclick="deleteAIStudySession('${item.id}')">Delete</button>
					<button class="submit-btn btn-sm" onclick="completeAIStudySession('${item.id}')">Complete</button>
				</div>
			</div>
		</li>
	`).join('');

	return aiStudySessionsCache;
};

window.startAIStudySession = async function(id) {
	await updateDoc(doc(db, 'aiStudySessions', id), { status: 'started' });
	await loadAIStudySessions();
};

window.editAIStudySession = function(id) {
	const target = aiStudySessionsCache.find(item => item.id === id);
	if (!target) return;
	aiStudyEditingSessionId = id;
	const dateEl = document.getElementById('aiStudyDate');
	const courseEl = document.getElementById('aiStudyCourse');
	const bookEl = document.getElementById('aiStudyBook');
	const topicEl = document.getElementById('aiStudyTopic');
	const durationEl = document.getElementById('aiStudyDuration');
	if (dateEl) dateEl.value = target.date || '';
	if (courseEl) courseEl.value = target.course || '';
	if (bookEl) bookEl.value = target.book || '';
	if (topicEl) topicEl.value = target.topic || '';
	if (durationEl) durationEl.value = target.duration || '';
	const finalizeBtn = document.getElementById('aiStudyFinalizeBtn');
	if (finalizeBtn) finalizeBtn.textContent = 'Update Session';
	const btn = Array.from(document.querySelectorAll('.tab-button')).find(button => button.dataset.tab === 'aiHome');
	switchTab('aiHome', btn || null);
	window.showAIStudyPlanner(true);
};

window.deleteAIStudySession = async function(id) {
	if (!confirm('Delete this planned study session?')) return;
	await deleteDoc(doc(db, 'aiStudySessions', id));
	await loadAIStudySessions();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();
};

window.completeAIStudySession = async function(id) {
	const target = aiStudySessionsCache.find(item => item.id === id);
	if (!target) return;

	const historyPayload = {
		date: target.date || '',
		course: target.course || '',
		book: target.book || '',
		topic: target.topic || '',
		duration: target.duration || null,
		status: 'completed',
		createdAt: target.createdAt || Date.now(),
		completedAt: Date.now(),
		userId: currentUserId
	};

	await addDoc(collection(db, 'aiStudyHistory'), historyPayload);
	await deleteDoc(doc(db, 'aiStudySessions', id));

	await loadAIStudySessions();
	await loadAIStudyHistory();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();
};

window.loadAIStudyHistory = async function() {
	const listEl = document.getElementById('aiHistoryList');
	if (!listEl || !currentUserId) return [];

	const snapshot = await getDocs(query(
		collection(db, 'aiStudyHistory'),
		where('userId', '==', currentUserId)
	));

	aiStudyHistoryCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
	aiStudyHistoryCache.sort((a, b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0));

	if (!aiStudyHistoryCache.length) {
		listEl.innerHTML = '<li style="color:#666;padding:1rem;">No completed study sessions yet.</li>';
		return aiStudyHistoryCache;
	}

	listEl.innerHTML = aiStudyHistoryCache.map(item => `
		<li>
			<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.8rem;flex-wrap:wrap;">
				<div style="flex:1;min-width:0;">
					<strong>${aiStudyEscapeHtml(item.date || '')}</strong>
					<div style="margin-top:0.35rem;color:var(--muted);">Course: ${aiStudyEscapeHtml(item.course || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Book: ${aiStudyEscapeHtml(item.book || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Topic: ${aiStudyEscapeHtml(item.topic || '-')}</div>
					<div style="margin-top:0.15rem;color:var(--muted);">Duration: ${item.duration ? `${item.duration} min` : '-'}</div>
				</div>
				<div class="card-actions">
					<button class="submit-btn btn-sm" onclick="editAIStudyHistory('${item.id}')">Edit</button>
					<button class="submit-btn btn-danger btn-sm" onclick="deleteAIStudyHistory('${item.id}')">Delete</button>
				</div>
			</div>
		</li>
	`).join('');

	return aiStudyHistoryCache;
};

window.editAIStudyHistory = async function(id) {
	const target = aiStudyHistoryCache.find(item => item.id === id);
	if (!target) return;

	const nextDate = prompt('Date (YYYY-MM-DD):', target.date || '');
	if (nextDate === null) return;
	const nextCourse = prompt('Course:', target.course || '');
	if (nextCourse === null) return;
	const nextBook = prompt('Book:', target.book || '');
	if (nextBook === null) return;
	const nextTopic = prompt('Topic / Notes:', target.topic || '');
	if (nextTopic === null) return;
	const nextDuration = prompt('Duration (minutes):', target.duration ? String(target.duration) : '');
	if (nextDuration === null) return;

	const parsedDuration = nextDuration.trim() ? Number(nextDuration.trim()) : null;
	if (nextDuration.trim() && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
		alert('Duration must be a positive number.');
		return;
	}

	await updateDoc(doc(db, 'aiStudyHistory', id), {
		date: nextDate.trim(),
		course: nextCourse.trim(),
		book: nextBook.trim(),
		topic: nextTopic.trim(),
		duration: parsedDuration
	});

	await loadAIStudyHistory();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();
};

window.deleteAIStudyHistory = async function(id) {
	if (!confirm('Delete this history record?')) return;
	await deleteDoc(doc(db, 'aiStudyHistory', id));
	await loadAIStudyHistory();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();
};

window.initAIStudyCalendar = function() {
	const monthEl = document.getElementById('aiCalMonth');
	const yearEl = document.getElementById('aiCalYear');
	if (!monthEl || !yearEl) return;

	monthEl.innerHTML = '';
	yearEl.innerHTML = '';

	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	months.forEach((monthName, index) => {
		const option = document.createElement('option');
		option.value = index;
		option.textContent = monthName;
		monthEl.appendChild(option);
	});

	const currentYear = new Date().getFullYear();
	for (let year = currentYear - 2; year <= currentYear + 2; year += 1) {
		const option = document.createElement('option');
		option.value = year;
		option.textContent = year;
		yearEl.appendChild(option);
	}

	const today = new Date();
	monthEl.value = today.getMonth();
	yearEl.value = today.getFullYear();

	monthEl.onchange = renderAIStudyCalendar;
	yearEl.onchange = renderAIStudyCalendar;

	loadAIStudyCalendarData();
};

async function loadAIStudyCalendarData() {
	aiCalendarPlannedDates = {};
	aiCalendarHistoryDates = {};
	aiCalendarPlannedDetails = {};
	aiCalendarHistoryDetails = {};

	if (!currentUserId) {
		renderAIStudyCalendar();
		return;
	}

	const sessionsSnapshot = await getDocs(query(
		collection(db, 'aiStudySessions'),
		where('userId', '==', currentUserId)
	));
	sessionsSnapshot.forEach(docSnap => {
		const item = docSnap.data();
		if (!item.date) return;
		aiCalendarPlannedDates[item.date] = true;
		if (!aiCalendarPlannedDetails[item.date]) aiCalendarPlannedDetails[item.date] = [];
		aiCalendarPlannedDetails[item.date].push(item);
	});

	const historySnapshot = await getDocs(query(
		collection(db, 'aiStudyHistory'),
		where('userId', '==', currentUserId)
	));
	historySnapshot.forEach(docSnap => {
		const item = docSnap.data();
		if (!item.date) return;
		aiCalendarHistoryDates[item.date] = true;
		if (!aiCalendarHistoryDetails[item.date]) aiCalendarHistoryDetails[item.date] = [];
		aiCalendarHistoryDetails[item.date].push(item);
	});

	renderAIStudyCalendar();
}

function renderAIStudyCalendar() {
	const monthEl = document.getElementById('aiCalMonth');
	const yearEl = document.getElementById('aiCalYear');
	const grid = document.getElementById('aiCalendarGrid');
	if (!monthEl || !yearEl || !grid) return;

	const month = Number(monthEl.value);
	const year = Number(yearEl.value);
	const first = new Date(year, month, 1);
	const last = new Date(year, month + 1, 0);
	const start = first.getDay();
	const days = last.getDate();

	grid.innerHTML = '';

	const headerRow = document.createElement('div');
	headerRow.className = 'calendar-row';
	['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(dayName => {
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

	for (let i = 0; i < start; i += 1) {
		const emptyCell = document.createElement('div');
		emptyCell.className = 'calendar-cell';
		emptyCell.style.background = 'transparent';
		row.appendChild(emptyCell);
	}

	for (let day = 1; day <= days; day += 1) {
		const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		const cell = document.createElement('div');
		cell.className = 'calendar-cell';
		if (aiCalendarPlannedDates[key] || aiCalendarHistoryDates[key]) {
			cell.classList.add('cal-train');
		}
		cell.textContent = day;
		cell.addEventListener('click', () => openAIStudyCalendarDetail(key));
		row.appendChild(cell);

		if ((start + day) % 7 === 0) {
			grid.appendChild(row);
			row = document.createElement('div');
			row.className = 'calendar-row';
		}
	}

	if (row.children.length > 0) grid.appendChild(row);
}

function openAIStudyCalendarDetail(dateStr) {
	const modal = document.getElementById('calendarDetailModal');
	const title = document.getElementById('calendarDetailTitle');
	const content = document.getElementById('calendarDetailContent');
	if (!modal || !title || !content) return;

	title.textContent = dateStr;
	const planned = aiCalendarPlannedDetails[dateStr] || [];
	const completed = aiCalendarHistoryDetails[dateStr] || [];

	let html = '';
	if (!planned.length && !completed.length) {
		html = '<p class="muted">No study sessions for this date.</p>';
	}

	if (planned.length) {
		html += '<div class="calendar-detail-section"><div class="calendar-detail-title">Planned Sessions</div>';
		planned.forEach(item => {
			html += `<div class="calendar-detail-item">${aiStudyEscapeHtml(item.course || '-')} | ${aiStudyEscapeHtml(item.book || '-')} | ${aiStudyEscapeHtml(item.topic || '-')} | ${item.duration ? `${item.duration} min` : '-'}</div>`;
		});
		html += '</div>';
	}

	if (completed.length) {
		html += '<div class="calendar-detail-section"><div class="calendar-detail-title">Completed Sessions</div>';
		completed.forEach(item => {
			html += `<div class="calendar-detail-item">${aiStudyEscapeHtml(item.course || '-')} | ${aiStudyEscapeHtml(item.book || '-')} | ${aiStudyEscapeHtml(item.topic || '-')} | ${item.duration ? `${item.duration} min` : '-'}</div>`;
		});
		html += '</div>';
	}

	content.innerHTML = html;
	modal.classList.add('active');
}

function resetAIStudyJournalForm() {
	const dateEl = document.getElementById('aiJournalDate');
	const textEl = document.getElementById('aiJournalText');
	const saveBtn = document.getElementById('aiJournalSaveBtn');
	if (dateEl) dateEl.value = aiStudyGetToday();
	if (textEl) textEl.value = '';
	if (saveBtn) saveBtn.textContent = 'Save Journal';
	aiStudyEditingJournalId = null;
}

window.saveAIStudyJournal = async function() {
	const date = document.getElementById('aiJournalDate')?.value || '';
	const text = document.getElementById('aiJournalText')?.value.trim() || '';
	if (!date) return alert('Please select a date.');
	if (!text) return alert('Please enter journal text.');

	if (aiStudyEditingJournalId) {
		await updateDoc(doc(db, 'aiStudyJournal', aiStudyEditingJournalId), { date, text });
	} else {
		await addDoc(collection(db, 'aiStudyJournal'), {
			date,
			text,
			createdAt: Date.now(),
			userId: currentUserId
		});
	}

	resetAIStudyJournalForm();
	await loadAIStudyJournal();
};

window.loadAIStudyJournal = async function() {
	const listEl = document.getElementById('aiJournalList');
	if (!listEl || !currentUserId) return [];

	const searchQuery = (document.getElementById('aiJournalSearchInput')?.value || '').trim().toLowerCase();
	const dateFilter = document.getElementById('aiJournalDateFilter')?.value || '';

	const snapshot = await getDocs(query(
		collection(db, 'aiStudyJournal'),
		where('userId', '==', currentUserId)
	));

	let items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
	items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
	items = items.filter(item => {
		if (dateFilter && item.date !== dateFilter) return false;
		const text = `${item.date || ''} ${item.text || ''}`.toLowerCase();
		if (searchQuery && !text.includes(searchQuery)) return false;
		return true;
	});

	if (!items.length) {
		listEl.innerHTML = '<li style="color:#666;padding:1rem;">No journal entries yet.</li>';
		return [];
	}

	listEl.innerHTML = items.map(item => `
		<li>
			<div class="journal-card">
				<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.8rem;flex-wrap:wrap;">
					<div style="font-size:1.02rem;font-weight:600;color:#0f2540;">${aiStudyEscapeHtml(item.date || '')}</div>
					<div class="card-actions">
						<button class="submit-btn btn-sm" onclick="editAIStudyJournal('${item.id}')">Edit</button>
						<button class="submit-btn btn-danger btn-sm" onclick="deleteAIStudyJournal('${item.id}')">Delete</button>
					</div>
				</div>
				<div class="journal-preview">${aiStudyEscapeHtml(item.text || '')}</div>
			</div>
		</li>
	`).join('');

	return items;
};

window.editAIStudyJournal = async function(id) {
	const snapshot = await getDoc(doc(db, 'aiStudyJournal', id));
	if (!snapshot.exists()) return;
	const data = snapshot.data();
	if ((data.userId || '') !== currentUserId) return alert('You do not have permission to edit this journal.');

	const dateEl = document.getElementById('aiJournalDate');
	const textEl = document.getElementById('aiJournalText');
	const saveBtn = document.getElementById('aiJournalSaveBtn');
	if (dateEl) dateEl.value = data.date || aiStudyGetToday();
	if (textEl) textEl.value = data.text || '';
	if (saveBtn) saveBtn.textContent = 'Update Journal';
	aiStudyEditingJournalId = id;
};

window.deleteAIStudyJournal = async function(id) {
	if (!confirm('Delete this journal entry?')) return;
	await deleteDoc(doc(db, 'aiStudyJournal', id));
	if (aiStudyEditingJournalId === id) resetAIStudyJournalForm();
	await loadAIStudyJournal();
};

window.initializeAIStudyModule = async function() {
	aiStudyEditingSessionId = null;
	const finalizeBtn = document.getElementById('aiStudyFinalizeBtn');
	if (finalizeBtn) finalizeBtn.textContent = 'Finalize Session';
	const form = document.getElementById('aiStudyForm');
	if (form) form.reset();
	aiStudySetDefaultDates();
	aiStudyToggleHomePlanner(false);
	resetAIStudyJournalForm();

	await loadAICourses();
	await loadAIBooks();
	await loadAIStudySessions();
	await loadAIStudyHistory();
	await loadAIStudyJournal();
	if (window.initAIStudyCalendar) window.initAIStudyCalendar();
};
