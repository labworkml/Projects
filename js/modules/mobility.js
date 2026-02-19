/* Mobility module logic extracted from index.html */
window.firebaseAddMobilityTemplate = async function(data) {
    try {
        if (!currentUserId) return;
        const exercises = (data.exercises || []).map(exercise => ({
            name: exercise.name,
            instructions: exercise.instructions,
            sets: exercise.sets,
            reps: exercise.reps
        }));
        const items = exercises.map(exercise => ({
            exerciseId: '',
            name: exercise.name,
            sets: exercise.sets,
            duration: exercise.reps
        }));

        const modernPayload = {
            userId: currentUserId,
            name: data.name,
            exercises,
            items,
            createdAt: Date.now()
        };

        try {
            await addDoc(collection(db, 'mobilityTemplates'), modernPayload);
        } catch (writeError) {
            if (String(writeError?.message || '').toLowerCase().includes('missing or insufficient permissions')) {
                await addDoc(collection(db, 'mobilityTemplates'), {
                    userId: currentUserId,
                    name: data.name,
                    items,
                    createdAt: Date.now()
                });
            } else {
                throw writeError;
            }
        }
    } catch (error) {
        alert('Error adding mobility template: ' + error.message);
        console.error(error);
    }
};

window.firebaseGetMobilityTemplates = async function() {
    if (!currentUserId) return [];

    const snapshot = await getDocs(query(
        collection(db, 'mobilityTemplates'),
        where('userId', '==', currentUserId)
    ));

    const templates = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const sourceExercises = (Array.isArray(data.exercises) && data.exercises.length > 0)
            ? data.exercises
            : (Array.isArray(data.items) ? data.items : []);

        templates.push({
            id: docSnap.id,
            ...data,
            exercises: sourceExercises.map(exercise => ({
                name: exercise.name || '',
                instructions: exercise.instructions || '',
                sets: Number(exercise.sets) || 1,
                reps: Number(exercise.reps || exercise.duration) || 1
            }))
        });
    });

    templates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return templates;
};

window.firebaseUpdateMobilityTemplate = async function(id, data) {
    try {
        const refDoc = doc(db, 'mobilityTemplates', id);
        const docSnap = await getDoc(refDoc);
        if (!docSnap.exists()) return alert('Template not found');
        const existing = docSnap.data();
        if (existing.userId !== currentUserId) return alert('You do not have permission to edit this template');

        const exercises = (data.exercises || []).map(exercise => ({
            name: exercise.name,
            instructions: exercise.instructions,
            sets: exercise.sets,
            reps: exercise.reps
        }));
        const items = exercises.map(exercise => ({
            exerciseId: '',
            name: exercise.name,
            sets: exercise.sets,
            duration: exercise.reps
        }));

        try {
            await updateDoc(refDoc, {
                name: data.name,
                exercises,
                items
            });
        } catch (writeError) {
            if (String(writeError?.message || '').toLowerCase().includes('missing or insufficient permissions')) {
                await updateDoc(refDoc, {
                    name: data.name,
                    items
                });
            } else {
                throw writeError;
            }
        }
    } catch (error) {
        alert('Error updating mobility template: ' + error.message);
        console.error(error);
    }
};

window.firebaseDeleteMobilityTemplate = async function(id) {
    try {
        if (!confirm('Delete this mobility template?')) return;

        const refDoc = doc(db, 'mobilityTemplates', id);
        const docSnap = await getDoc(refDoc);
        if (!docSnap.exists()) return alert('Template not found');
        const existing = docSnap.data();
        if (existing.userId !== currentUserId) return alert('You do not have permission to delete this template');

        await deleteDoc(refDoc);
        await window.firebaseRenderMobilityTemplates();
    } catch (error) {
        alert('Error deleting mobility template: ' + error.message);
        console.error(error);
    }
};

window.firebaseRenderMobilityTemplates = async function() {
    const listEl = document.getElementById('mobilityTemplatesList');
    if (!listEl) return;

    const templates = await window.firebaseGetMobilityTemplates();
    window.mobilityTemplatesCache = templates;

    if (!templates.length) {
        listEl.innerHTML = '<li style="color:#666;padding:1rem;">No mobility templates yet. Create your first template.</li>';
        return;
    }

    listEl.innerHTML = templates.map(template => {
        const exerciseCount = (template.exercises || []).length;
        return `
            <li>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.8rem;flex-wrap:wrap;">
                    <div style="flex:1;min-width:0;">
                        <strong>${template.name || 'Untitled Template'}</strong>
                        <p style="color:var(--muted);font-size:0.92rem;margin:0.35rem 0 0 0;">${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}</p>
                    </div>
                    <div class="card-actions">
                        <button class="submit-btn btn-sm" onclick="openMobilityDesignSessionModal('${template.id}')">Use Template</button>
                        <button class="submit-btn btn-sm" onclick="openMobilityTemplateBuilder('${template.id}')">Edit</button>
                        <button class="submit-btn btn-danger btn-sm" onclick="window.firebaseDeleteMobilityTemplate('${template.id}')">Delete</button>
                    </div>
                </div>
            </li>
        `;
    }).join('');
};

window.firebaseCreateMobilitySession = async function(templateId, date) {
    try {
        const template = (window.mobilityTemplatesCache || []).find(t => t.id === templateId)
            || (await window.firebaseGetMobilityTemplates()).find(t => t.id === templateId);

        if (!template) return alert('Template not found');

        const modernPayload = {
            userId: currentUserId,
            templateId,
            templateName: template.name || 'Untitled Template',
            date,
            exercises: (template.exercises || []).map(exercise => ({
                name: exercise.name,
                instructions: exercise.instructions,
                sets: exercise.sets,
                reps: exercise.reps
            })),
            items: (template.exercises || []).map(exercise => ({
                exerciseId: '',
                name: exercise.name,
                instructions: exercise.instructions,
                sets: exercise.sets,
                reps: exercise.reps,
                duration: exercise.reps
            })),
            status: 'planned',
            createdAt: Date.now()
        };

        try {
            await addDoc(collection(db, 'mobilitySessions'), modernPayload);
        } catch (writeError) {
            if (String(writeError?.message || '').toLowerCase().includes('missing or insufficient permissions')) {
                await addDoc(collection(db, 'mobilitySessions'), {
                    userId: currentUserId,
                    templateId,
                    templateName: template.name || 'Untitled Template',
                    date,
                    items: modernPayload.items,
                    status: 'planned',
                    createdAt: Date.now()
                });
            } else {
                throw writeError;
            }
        }

        await window.firebaseRenderMobilitySessions();
    } catch (error) {
        alert('Error creating mobility session: ' + error.message);
        console.error(error);
    }
};

window.firebaseGetMobilitySessions = async function() {
    if (!currentUserId) return [];

    const snapshot = await getDocs(query(
        collection(db, 'mobilitySessions'),
        where('userId', '==', currentUserId)
    ));

    const sessions = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const sourceExercises = (Array.isArray(data.exercises) && data.exercises.length > 0)
            ? data.exercises
            : (Array.isArray(data.items) ? data.items : []);

        sessions.push({
            id: docSnap.id,
            ...data,
            exercises: sourceExercises.map(exercise => ({
                name: exercise.name || '',
                instructions: exercise.instructions || '',
                sets: Number(exercise.sets) || 1,
                reps: Number(exercise.reps || exercise.duration) || 1
            }))
        });
    });

    sessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sessions;
};

window.firebaseUpdateMobilitySession = async function(id, data) {
    try {
        const refDoc = doc(db, 'mobilitySessions', id);
        const docSnap = await getDoc(refDoc);
        if (!docSnap.exists()) return alert('Session not found');
        const existing = docSnap.data();
        if (existing.userId !== currentUserId) return alert('You do not have permission to edit this session');

        await updateDoc(refDoc, data);
        await window.firebaseRenderMobilitySessions();
        if (window.initMobilityCalendar) window.initMobilityCalendar();
    } catch (error) {
        alert('Error updating mobility session: ' + error.message);
        console.error(error);
    }
};

window.firebaseRenderMobilitySessions = async function() {
    const listEl = document.getElementById('mobilitySessionsList');
    if (!listEl || !currentUserId) return;

    const sessions = await window.firebaseGetMobilitySessions();
    const upcoming = sessions.filter(session => (session.status || 'planned') === 'planned');

    window.mobilitySessionDataMap = {};

    if (!upcoming.length) {
        listEl.innerHTML = '<li style="color:#666;padding:1rem;">No upcoming mobility sessions.</li>';
        return;
    }

    listEl.innerHTML = upcoming.map(session => {
        window.mobilitySessionDataMap[session.id] = session;
        const exerciseCount = (session.exercises || []).length;
        return `
            <li>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:0.8rem;flex-wrap:wrap;">
                    <div>
                        <strong>${session.date || ''}</strong>
                        <p style="color:var(--muted);font-size:0.9rem;margin:0.2rem 0 0 0;">${session.templateName || 'Untitled Template'}</p>
                        <p style="color:var(--muted);font-size:0.9rem;margin:0.2rem 0 0 0;">${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}</p>
                    </div>
                    <div class="card-actions">
                        <button class="submit-btn btn-sm" onclick="startMobilitySession('${session.id}')">Start</button>
                        <button class="submit-btn btn-sm" onclick="editMobilitySessionDate('${session.id}')">Edit Date</button>
                        <button class="submit-btn btn-danger btn-sm" onclick="window.firebaseDeleteMobilitySession('${session.id}')">Delete</button>
                    </div>
                </div>
            </li>
        `;
    }).join('');
};

window.firebaseDeleteMobilitySession = async function(id) {
    try {
        if (!confirm('Delete this planned mobility session?')) return;

        const refDoc = doc(db, 'mobilitySessions', id);
        const docSnap = await getDoc(refDoc);
        if (!docSnap.exists()) return alert('Session not found');
        const session = docSnap.data();
        if (session.userId !== currentUserId) return alert('You do not have permission to delete this session');

        await deleteDoc(refDoc);
        await window.firebaseRenderMobilitySessions();
        if (window.initMobilityCalendar) window.initMobilityCalendar();
    } catch (error) {
        alert('Error deleting mobility session: ' + error.message);
        console.error(error);
    }
};
