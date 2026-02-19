/* Insurance module logic extracted from index.html */
window.firebaseGetInsuranceActs = async function() {
    if (!currentUserId) return [];

    const snapshot = await getDocs(query(
        collection(db, 'insurance_acts'),
        where('userId', '==', currentUserId)
    ));

    const acts = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        acts.push({
            actId: docSnap.id,
            actName: data.actName || '',
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
        collection(db, 'insurance_provisions'),
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
    if (!currentUserId) return;
    await addDoc(collection(db, 'insurance_acts'), {
        userId: currentUserId,
        module: 'Insurance',
        actName: data.actName || '',
        year: data.year || '',
        description: data.description || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
};

window.firebaseUpdateInsuranceAct = async function(actId, data) {
    const refDoc = doc(db, 'insurance_acts', actId);
    const docSnap = await getDoc(refDoc);
    if (!docSnap.exists()) throw new Error('Act not found');

    const existing = docSnap.data() || {};
    if (existing.userId !== currentUserId) {
        throw new Error('You do not have permission to edit this act');
    }

    await updateDoc(refDoc, {
        actName: data.actName || '',
        year: data.year || '',
        description: data.description || '',
        updatedAt: Date.now()
    });
};

window.firebaseDeleteInsuranceActAndProvisions = async function(actId) {
    const refAct = doc(db, 'insurance_acts', actId);
    const actSnap = await getDoc(refAct);
    if (!actSnap.exists()) throw new Error('Act not found');

    const existingAct = actSnap.data() || {};
    if (existingAct.userId !== currentUserId) {
        throw new Error('You do not have permission to delete this act');
    }

    const provisionsSnapshot = await getDocs(query(
        collection(db, 'insurance_provisions'),
        where('userId', '==', currentUserId)
    ));

    const deletePromises = [];
    provisionsSnapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        if (data.actId === actId) {
            deletePromises.push(deleteDoc(doc(db, 'insurance_provisions', docSnap.id)));
        }
    });

    await Promise.all(deletePromises);
    await deleteDoc(refAct);
};

window.firebaseCreateInsuranceProvision = async function(data) {
    if (!currentUserId) return;
    await addDoc(collection(db, 'insurance_provisions'), {
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
    const refDoc = doc(db, 'insurance_provisions', provisionId);
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
    const refDoc = doc(db, 'insurance_provisions', provisionId);
    const docSnap = await getDoc(refDoc);
    if (!docSnap.exists()) throw new Error('Provision not found');

    const existing = docSnap.data() || {};
    if (existing.userId !== currentUserId) {
        throw new Error('You do not have permission to delete this provision');
    }

    await deleteDoc(refDoc);
};
