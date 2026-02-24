/* Insurance module logic extracted from index.html */
function appendInsuranceChatMessage(role, text) {
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;

    const msg = document.createElement('div');
    msg.className = role === 'user' ? 'user-message' : 'ai-message';
    msg.innerText = String(text || '');
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.askInsuranceAssistant = async function(query) {
    console.log("AI called with:", query);

    const message = String(query || '').trim();
    if (!message) return;

    appendInsuranceChatMessage('user', message);

    const inputEl = document.getElementById('insuranceInput');
    if (inputEl) inputEl.value = '';

    if (typeof window.askInsuranceAI === 'function') {
        try {
            const result = await window.askInsuranceAI(message);
            if (typeof result === 'string' && result.trim()) {
                appendInsuranceChatMessage('ai', result.trim());
            }
            return;
        } catch (error) {
            console.error(error);
            appendInsuranceChatMessage('ai', 'Error fetching insurance intelligence.');
            return;
        }
    }

    appendInsuranceChatMessage('ai', 'Insurance AI is not ready yet.');
};

function bindInsuranceSendHandler() {
    const sendBtn = document.getElementById('insuranceSendBtn');
    const inputEl = document.getElementById('insuranceInput');
    if (!sendBtn || !inputEl) return;

    if (sendBtn.dataset.boundInsuranceSend === 'true') return;
    sendBtn.dataset.boundInsuranceSend = 'true';

    sendBtn.addEventListener('click', () => {
        console.log('Send clicked');

        const input = document.getElementById('insuranceInput').value;
        console.log('User input:', input);

        if (window.askInsuranceAssistant) {
            window.askInsuranceAssistant(input);
        }
    });

    inputEl.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            sendBtn.click();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInsuranceSendHandler);
} else {
    bindInsuranceSendHandler();
}

function normalizeInsuranceActName(value) {
    const text = String(value || '').trim();
    const cleaned = text
        .replace(/^['"`]+/, '')
        .replace(/^(?:ðŸ[\u0080-\u00BF]{0,4}|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â[\u0080-\u00BF]{1,2})+/g, '')
        .trim();

    return cleaned || 'Insurance Act';
}

window.firebaseGetInsuranceActs = async function() {
    if (!currentUserId) return [];

    const snapshot = await getDocs(query(
        collection(db, 'acts'),
        where('userId', '==', currentUserId)
    ));

    const acts = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        acts.push({
            actId: docSnap.id,
            actName: normalizeInsuranceActName(data.actName || data.title || ''),
            year: data.year || '',
            description: data.description || '',
            createdAt: data.createdAt || 0,
            updatedAt: data.updatedAt || 0
        });
    });

    acts.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return acts;
};

window.firebaseGetInsuranceProvisions = async function() {
    if (!currentUserId) return [];

    const snapshot = await getDocs(query(
        collection(db, 'provisions'),
        where('userId', '==', currentUserId)
    ));

    const provisions = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        provisions.push({
            provisionId: docSnap.id,
            actId: data.actId || '',
            sectionNumber: data.sectionNumber || '',
            sectionTitle: data.sectionTitle || '',
            sectionText: data.sectionText || '',
            plainExplanation: data.plainExplanation || '',
            purposeOfSection: data.purposeOfSection || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            relatedSections: Array.isArray(data.relatedSections) ? data.relatedSections : [],
            supervisoryFocusAreas: data.supervisoryFocusAreas || '',
            practicalExamples: data.practicalExamples || '',
            createdAt: data.createdAt || 0,
            updatedAt: data.updatedAt || 0
        });
    });

    provisions.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return provisions;
};

window.firebaseLoadInsuranceActsAndProvisions = async function() {
    if (!currentUserId) {
        insuranceActs = [];
        insuranceProvisions = [];
        return;
    }

    const [acts, provisions] = await Promise.all([
        window.firebaseGetInsuranceActs(),
        window.firebaseGetInsuranceProvisions()
    ]);

    insuranceActs = acts;
    insuranceProvisions = provisions.filter(item => insuranceActs.some(act => act.actId === item.actId));

    if (insuranceActiveActId && !insuranceActs.some(act => act.actId === insuranceActiveActId)) {
        insuranceActiveActId = null;
    }

    if (insuranceProvisionEditId && !insuranceProvisions.some(item => item.provisionId === insuranceProvisionEditId)) {
        insuranceProvisionEditId = null;
    }
};

window.firebaseCreateInsuranceAct = async function(data) {
    if (!currentUserId) {
        alert('Not logged in');
        return;
    }

    await addDoc(collection(db, 'acts'), {
        userId: currentUserId,
        module: 'Insurance',
        actName: normalizeInsuranceActName(data.actName || ''),
        year: data.year || '',
        description: data.description || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
};

window.firebaseUpdateInsuranceAct = async function(actId, data) {
    const refDoc = doc(db, 'acts', actId);
    const docSnap = await getDoc(refDoc);
    if (!docSnap.exists()) throw new Error('Act not found');

    const existing = docSnap.data() || {};
    if (existing.userId !== currentUserId) {
        throw new Error('You do not have permission to edit this act');
    }

    await updateDoc(refDoc, {
        actName: normalizeInsuranceActName(data.actName || ''),
        year: data.year || '',
        description: data.description || '',
        updatedAt: Date.now()
    });
};

window.firebaseDeleteInsuranceActAndProvisions = async function(actId) {
    const refAct = doc(db, 'acts', actId);
    const actSnap = await getDoc(refAct);
    if (!actSnap.exists()) throw new Error('Act not found');

    const existingAct = actSnap.data() || {};
    if (existingAct.userId !== currentUserId) {
        throw new Error('You do not have permission to delete this act');
    }

    const provisionsSnapshot = await getDocs(query(
        collection(db, 'provisions'),
        where('userId', '==', currentUserId)
    ));

    const deletePromises = [];
    provisionsSnapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        if (data.actId === actId) {
            deletePromises.push(deleteDoc(doc(db, 'provisions', docSnap.id)));
        }
    });

    await Promise.all(deletePromises);
    await deleteDoc(refAct);
};

window.firebaseCreateInsuranceProvision = async function(data) {
    if (!currentUserId) return;
    await addDoc(collection(db, 'provisions'), {
        userId: currentUserId,
        module: 'Insurance',
        actId: data.actId || '',
        sectionNumber: data.sectionNumber || '',
        sectionTitle: data.sectionTitle || '',
        sectionText: data.sectionText || '',
        plainExplanation: data.plainExplanation || '',
        purposeOfSection: data.purposeOfSection || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        relatedSections: Array.isArray(data.relatedSections) ? data.relatedSections : [],
        supervisoryFocusAreas: data.supervisoryFocusAreas || '',
        practicalExamples: data.practicalExamples || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
};

window.firebaseUpdateInsuranceProvision = async function(provisionId, data) {
    const refDoc = doc(db, 'provisions', provisionId);
    const docSnap = await getDoc(refDoc);
    if (!docSnap.exists()) throw new Error('Provision not found');

    const existing = docSnap.data() || {};
    if (existing.userId !== currentUserId) {
        throw new Error('You do not have permission to edit this provision');
    }

    await updateDoc(refDoc, {
        actId: data.actId || '',
        sectionNumber: data.sectionNumber || '',
        sectionTitle: data.sectionTitle || '',
        sectionText: data.sectionText || '',
        plainExplanation: data.plainExplanation || '',
        purposeOfSection: data.purposeOfSection || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        relatedSections: Array.isArray(data.relatedSections) ? data.relatedSections : [],
        supervisoryFocusAreas: data.supervisoryFocusAreas || '',
        practicalExamples: data.practicalExamples || '',
        updatedAt: Date.now()
    });
};

window.firebaseDeleteInsuranceProvision = async function(provisionId) {
    const refDoc = doc(db, 'provisions', provisionId);
    const docSnap = await getDoc(refDoc);
    if (!docSnap.exists()) throw new Error('Provision not found');

    const existing = docSnap.data() || {};
    if (existing.userId !== currentUserId) {
        throw new Error('You do not have permission to delete this provision');
    }

    await deleteDoc(refDoc);
};
