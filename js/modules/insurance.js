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

let insuranceStateDataCache = null;

function parseNumericValue(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? '')
        .replace(/,/g, '')
        .replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function safeLower(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeToken(value) {
    return safeLower(value).replace(/[^a-z0-9]/g, '');
}

function formatIndianNumber(value) {
    return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

async function getInsuranceStateData() {
    if (Array.isArray(insuranceStateDataCache)) return insuranceStateDataCache;

    if (!window.db || !window.collection || !window.getDocs) {
        throw new Error('Database is not initialized yet.');
    }

    const snapshot = await window.getDocs(window.collection(window.db, 'state_lob_data'));
    const records = [];
    snapshot.forEach(docSnap => {
        records.push(docSnap.data() || {});
    });

    insuranceStateDataCache = records;
    return records;
}

function buildStateFiguresReply(userQuery, records) {
    const queryText = safeLower(userQuery);
    const queryToken = normalizeToken(userQuery);
    const yearMatch = queryText.match(/\b(19|20)\d{2}\b/);
    const queryYear = yearMatch ? yearMatch[0] : '';

    const keywordList = ['aviation', 'motor', 'health', 'fire', 'marine', 'crop', 'liability', 'travel', 'engineering'];
    const keyword = keywordList.find(word => queryText.includes(word)) || '';

    const uniqueStates = Array.from(new Set(
        records
            .map(item => String(item.state_name || item.state || '').trim())
            .filter(Boolean)
    ));

    const matchedStates = uniqueStates.filter(stateName => {
        const stateLower = safeLower(stateName);
        const stateToken = normalizeToken(stateName);
        return queryText.includes(stateLower) || (stateToken && queryToken.includes(stateToken));
    });

    const compareIntent = /\b(compare|vs|versus)\b/.test(queryText);

    const filterRows = (stateName = '') => records.filter(item => {
        const rowState = String(item.state_name || item.state || '').trim();
        const rowStateLower = safeLower(rowState);
        if (stateName && rowStateLower !== safeLower(stateName)) return false;

        if (queryYear && String(item.year || '').trim() !== queryYear) return false;

        if (keyword) {
            const lob = safeLower(item.lob || '');
            const segment = safeLower(item.segment || '');
            if (!lob.includes(keyword) && !segment.includes(keyword)) return false;
        }

        return true;
    });

    const summarize = rows => {
        const total = rows.reduce((sum, item) => sum + parseNumericValue(item.value), 0);
        const byLob = new Map();
        rows.forEach(item => {
            const lob = String(item.lob || item.segment || 'Unknown').trim() || 'Unknown';
            byLob.set(lob, (byLob.get(lob) || 0) + parseNumericValue(item.value));
        });

        const topLobs = Array.from(byLob.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([lob, value]) => `${lob}: ${formatIndianNumber(value)}`);

        return {
            count: rows.length,
            total,
            topLobs
        };
    };

    if (compareIntent && matchedStates.length >= 2) {
        const leftState = matchedStates[0];
        const rightState = matchedStates[1];

        const leftRows = filterRows(leftState);
        const rightRows = filterRows(rightState);

        if (!leftRows.length && !rightRows.length) {
            return 'No matching records found for comparison. Try: Compare Karnataka and Andhra Pradesh in marine 2024.';
        }

        const left = summarize(leftRows);
        const right = summarize(rightRows);
        const diff = left.total - right.total;
        const winner = diff === 0 ? 'Both are equal' : diff > 0 ? leftState : rightState;
        const scope = `${queryYear || 'all years'}${keyword ? `, ${keyword}` : ''}`;

        return [
            `Comparison (${scope}): ${leftState} vs ${rightState}`,
            `${leftState} — Total: ${formatIndianNumber(left.total)} | Records: ${left.count} | Top: ${left.topLobs.join(' | ') || 'n/a'}`,
            `${rightState} — Total: ${formatIndianNumber(right.total)} | Records: ${right.count} | Top: ${right.topLobs.join(' | ') || 'n/a'}`,
            `${winner}${diff !== 0 ? ` leads by ${formatIndianNumber(Math.abs(diff))}` : ''}.`
        ].join('\n');
    }

    const selectedState = matchedStates[0] || '';
    const filtered = filterRows(selectedState);

    if (!filtered.length) {
        return 'No matching records found in state_lob_data. Try a query like: Karnataka aviation 2025, or Compare Karnataka and Andhra Pradesh marine 2024.';
    }

    const summary = summarize(filtered);
    const scopeState = selectedState || 'All states';
    const scopeYear = queryYear || 'all years';
    const scopeKeyword = keyword ? `, ${keyword}` : '';

    return [
        `${scopeState} (${scopeYear}${scopeKeyword})`,
        `Total value: ${formatIndianNumber(summary.total)} | Records: ${summary.count}`,
        `Top lines: ${summary.topLobs.join(' | ') || 'n/a'}`
    ].join('\n');
}

async function fetchInsuranceDatabaseReply(userQuery) {
    const records = await getInsuranceStateData();
    return buildStateFiguresReply(userQuery, records);
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

    try {
        const dbReply = await fetchInsuranceDatabaseReply(message);
        appendInsuranceChatMessage('ai', dbReply);
    } catch (error) {
        console.error(error);
        appendInsuranceChatMessage('ai', 'Insurance AI is not ready yet and database lookup failed.');
    }
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

let insuranceNonLifeMasterCache = null;
let insuranceSolvencyRatioContext = null;

function insuranceNormalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function insuranceIsSolvencySelection(infoTypeSelect) {
    if (!infoTypeSelect) return false;
    const selectedValue = insuranceNormalizeText(infoTypeSelect.value);
    const selectedText = insuranceNormalizeText(infoTypeSelect.options?.[infoTypeSelect.selectedIndex]?.text || '');
    return selectedValue === 'solvency_ratio' || selectedText === 'solvency ratio';
}

function insuranceFormatSolvencyValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2) : String(value);
}

function insuranceFindQuarterValue(yearData, quarterKeys) {
    if (!yearData || typeof yearData !== 'object') return '—';
    const normalizedMap = {};
    Object.keys(yearData).forEach(key => {
        normalizedMap[insuranceNormalizeText(key)] = yearData[key];
    });

    for (const key of quarterKeys) {
        const value = normalizedMap[insuranceNormalizeText(key)];
        if (value !== undefined) {
            return insuranceFormatSolvencyValue(value);
        }
    }

    return '—';
}

async function insuranceGetNonLifeMasterData() {
    if (Array.isArray(insuranceNonLifeMasterCache)) return insuranceNonLifeMasterCache;
    if (!window.db || !window.collection || !window.getDocs) return [];

    const snapshot = await window.getDocs(window.collection(window.db, 'insurers_master_nonlife'));
    const records = [];
    snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...(docSnap.data() || {}) });
    });

    insuranceNonLifeMasterCache = records;
    return records;
}

function cleanupInsuranceLeftPanelTitle() {
    const leftPanel = document.getElementById('insuranceLeftPanelContent');
    if (!leftPanel) return;

    const firstTable = leftPanel.querySelector('table');
    if (!firstTable) return;

    leftPanel.querySelectorAll('table caption').forEach(caption => caption.remove());

    const removePlainTextNodesBefore = container => {
        let pointer = container.firstChild;
        while (pointer && pointer !== firstTable) {
            const next = pointer.nextSibling;
            if (pointer.nodeType === Node.TEXT_NODE && String(pointer.textContent || '').trim()) {
                pointer.remove();
            }
            pointer = next;
        }
    };

    removePlainTextNodesBefore(leftPanel);

    const tableContainer = firstTable.parentElement;
    if (tableContainer) {
        const children = Array.from(tableContainer.children);
        const tableIndex = children.indexOf(firstTable);
        if (tableIndex > 0) {
            children.slice(0, tableIndex).forEach(child => {
                const tag = String(child.tagName || '').toLowerCase();
                const looksLikeTitle = /^(h1|h2|h3|h4|h5|h6|p|span|strong|small|label)$/.test(tag)
                    || child.classList.contains('insurance-premium-title');
                const isSimpleTextBlock = child.children.length === 0 && String(child.textContent || '').trim().length > 0;

                if (looksLikeTitle || isSimpleTextBlock) {
                    child.remove();
                }
            });
        }
    }

    const topChildren = Array.from(leftPanel.children);
    const tableHostIndex = topChildren.findIndex(child => child === firstTable || child.querySelector('table'));
    if (tableHostIndex > 0) {
        topChildren.slice(0, tableHostIndex).forEach(child => {
            const hasTable = !!child.querySelector('table');
            const tag = String(child.tagName || '').toLowerCase();
            const looksLikeTitle = /^(h1|h2|h3|h4|h5|h6|p|span|strong|small|label)$/.test(tag)
                || child.classList.contains('insurance-premium-title');
            const isSimpleTextBlock = child.children.length === 0 && String(child.textContent || '').trim().length > 0;

            if (!hasTable && (looksLikeTitle || isSimpleTextBlock)) {
                child.remove();
            }
        });
    }
}

async function renderInsuranceSolvencyRatioPanel() {
    const infoTypeSelect = document.getElementById('insuranceInfoTypeSelect');
    const insurerSelect = document.getElementById('insuranceInsurerSelect');
    const leftPanel = document.getElementById('insuranceLeftPanelContent');
    const timelineControl = document.getElementById('insuranceTimelineControl');
    const timelineSelect = document.getElementById('insuranceTimelineSelect');
    if (!infoTypeSelect || !insurerSelect || !leftPanel) return;

    if (!insuranceIsSolvencySelection(infoTypeSelect)) return;

    const selectedInsurerValue = String(insurerSelect.value || '').trim();
    if (!selectedInsurerValue) {
        leftPanel.innerHTML = '<p class="insurance-data-muted">Select an insurer to view Solvency Ratio.</p>';
        return;
    }

    const selectedInsurerText = String(insurerSelect.options?.[insurerSelect.selectedIndex]?.text || '').trim();
    const selectedValueNormalized = insuranceNormalizeText(selectedInsurerValue);
    const selectedTextNormalized = insuranceNormalizeText(selectedInsurerText);

    let records = [];
    try {
        records = await insuranceGetNonLifeMasterData();
    } catch (error) {
        console.error('Error loading insurers_master_nonlife:', error);
        leftPanel.innerHTML = '<p class="insurance-data-muted">Unable to load Solvency Ratio data.</p>';
        return;
    }

    const matchedRecord = records.find(record => {
        const idValue = insuranceNormalizeText(record.id);
        const nameValue = insuranceNormalizeText(record.insurer_name || record.insurer || record.name);
        const regNoValue = insuranceNormalizeText(record.reg_no);

        return idValue === selectedValueNormalized
            || nameValue === selectedValueNormalized
            || nameValue === selectedTextNormalized
            || regNoValue === selectedValueNormalized;
    });

    const solvencyRatio = matchedRecord?.solvency_ratio;
    if (!solvencyRatio || typeof solvencyRatio !== 'object') {
        leftPanel.innerHTML = '<p class="insurance-data-muted">Solvency Ratio data is not available for the selected insurer.</p>';
        return;
    }

    const availableYears = Object.keys(solvencyRatio)
        .map(year => Number(String(year).trim()))
        .filter(year => Number.isInteger(year) && year >= 2015)
        .sort((a, b) => a - b);

    if (!availableYears.length) {
        leftPanel.innerHTML = '<p class="insurance-data-muted">No Solvency Ratio records found from 2015 onward.</p>';
        return;
    }

    const startYear = 2015;
    const endYear = availableYears[availableYears.length - 1];
    const yearRange = [];
    for (let year = startYear; year <= endYear; year += 1) {
        yearRange.push(String(year));
    }

    if (timelineControl && timelineSelect) {
        timelineControl.classList.add('show');
        timelineControl.setAttribute('aria-hidden', 'false');
        timelineSelect.disabled = false;

        const previousValue = timelineSelect.value || 'all_years';
        timelineSelect.innerHTML = [
            '<option value="all_years">All Years</option>',
            '<option value="last_3_years">Last 3 Years</option>',
            '<option value="last_5_years">Last 5 Years</option>'
        ].join('');
        yearRange.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            timelineSelect.appendChild(option);
        });

        timelineSelect.value = yearRange.includes(previousValue)
            || previousValue === 'all_years'
            || previousValue === 'last_3_years'
            || previousValue === 'last_5_years'
            ? previousValue
            : 'all_years';
    }

    insuranceSolvencyRatioContext = {
        yearRange,
        solvencyRatio
    };

    const activeTimeline = timelineSelect?.value || 'all_years';
    let yearsToRender = yearRange;
    if (activeTimeline === 'last_3_years') {
        yearsToRender = yearRange.slice(-3);
    } else if (activeTimeline === 'last_5_years') {
        yearsToRender = yearRange.slice(-5);
    } else if (activeTimeline !== 'all_years') {
        yearsToRender = yearRange.includes(activeTimeline) ? [activeTimeline] : yearRange;
    }

    const solvency = matchedRecord.solvency_ratio || {};
    const years = yearsToRender;

    let tableHTML = `
        <div class="solvency-card">
            <table class="solvency-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>March</th>
                        <th>June</th>
                        <th>Sept</th>
                        <th>Dec</th>
                    </tr>
                </thead>
                <tbody>
    `;

    years.forEach(year => {
        const y = solvency[year] || {};

        tableHTML += `
            <tr>
                <td class="year-col">${year}</td>
                <td>${y.March ?? '-'}</td>
                <td>${y.June ?? '-'}</td>
                <td>${y.Sept ?? '-'}</td>
                <td>${y.Dec ?? '-'}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    leftPanel.innerHTML = tableHTML;
}

function bindInsuranceSolvencyRatioHandlers() {
    const infoTypeSelect = document.getElementById('insuranceInfoTypeSelect');
    const insurerSelect = document.getElementById('insuranceInsurerSelect');
    const timelineSelect = document.getElementById('insuranceTimelineSelect');
    const leftPanel = document.getElementById('insuranceLeftPanelContent');
    if (!infoTypeSelect || !insurerSelect) return;

    const ensureSolvencyOption = () => {
        const hasSolvencyOption = Array.from(infoTypeSelect.options || []).some(option => option.value === 'solvency_ratio');
        if (hasSolvencyOption) return;
        const solvencyOption = document.createElement('option');
        solvencyOption.value = 'solvency_ratio';
        solvencyOption.textContent = 'Solvency Ratio';
        const equityOption = Array.from(infoTypeSelect.options || []).find(option => option.value === 'equity_share_capital');
        if (equityOption) {
            infoTypeSelect.insertBefore(solvencyOption, equityOption);
        } else {
            infoTypeSelect.appendChild(solvencyOption);
        }
    };

    ensureSolvencyOption();

    if (typeof MutationObserver !== 'undefined' && infoTypeSelect.dataset.solvencyOptionObserverBound !== 'true') {
        const observer = new MutationObserver(() => {
            ensureSolvencyOption();
        });
        observer.observe(infoTypeSelect, { childList: true });
        infoTypeSelect.dataset.solvencyOptionObserverBound = 'true';
    }

    if (infoTypeSelect.dataset.solvencyRatioBound === 'true') return;

    infoTypeSelect.dataset.solvencyRatioBound = 'true';

    infoTypeSelect.addEventListener('change', () => {
        setTimeout(() => {
            renderInsuranceSolvencyRatioPanel();
        }, 0);
    });

    insurerSelect.addEventListener('change', () => {
        setTimeout(() => {
            renderInsuranceSolvencyRatioPanel();
        }, 0);
    });

    if (timelineSelect && timelineSelect.dataset.solvencyTimelineBound !== 'true') {
        timelineSelect.dataset.solvencyTimelineBound = 'true';
        timelineSelect.addEventListener('change', () => {
            if (!insuranceSolvencyRatioContext || !insuranceIsSolvencySelection(infoTypeSelect)) return;
            setTimeout(() => {
                renderInsuranceSolvencyRatioPanel();
            }, 0);
        });
    }

    if (leftPanel && leftPanel.dataset.insuranceTitleCleanupBound !== 'true') {
        const cleanup = () => {
            cleanupInsuranceLeftPanelTitle();
        };

        const observer = new MutationObserver(() => {
            cleanup();
        });
        observer.observe(leftPanel, { childList: true, subtree: true, characterData: true });
        leftPanel.dataset.insuranceTitleCleanupBound = 'true';
        cleanup();
    }
}

window.renderInsuranceSolvencyRatioPanel = renderInsuranceSolvencyRatioPanel;

window.exportInsuranceData = function() {
    const leftPanel = document.getElementById('insuranceLeftPanelContent');
    if (!leftPanel) return;

    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.writeFile) {
        alert('Excel export library is not available. Please refresh and try again.');
        return;
    }

    const getSelection = (id, label) => {
        const selectEl = document.getElementById(id);
        if (!selectEl || selectEl.selectedIndex < 0) return null;
        const value = String(selectEl.value || '').trim();
        const text = String(selectEl.options?.[selectEl.selectedIndex]?.text || '').trim();
        if (!value) return null;
        return { label, value: text || value };
    };

    const selections = [
        getSelection('insuranceDomainSelect', 'Domain'),
        getSelection('insuranceInsurerSelect', 'Name'),
        getSelection('insuranceStateSelect', 'State'),
        getSelection('insuranceInfoTypeSelect', 'Information'),
        getSelection('insuranceCategorySelect', 'Category'),
        getSelection('insuranceLobSelect', 'LOB'),
        getSelection('insuranceSegmentSelect', 'Segment')
    ].filter(Boolean);

    const timelineControl = document.getElementById('insuranceTimelineControl');
    const timelineSelection = getSelection('insuranceTimelineSelect', 'Timeline');
    if (timelineSelection && timelineControl?.classList.contains('show')) {
        selections.push(timelineSelection);
    }

    const tables = Array.from(leftPanel.querySelectorAll('table'));
    const sheetData = [];

    if (selections.length) {
        sheetData.push(['Selections']);
        selections.forEach(item => {
            sheetData.push([item.label, item.value]);
        });
        sheetData.push([]);
    }

    let hasExportData = false;

    if (tables.length) {
        tables.forEach((table, index) => {
            const rows = Array.from(table.querySelectorAll('tr')).map(row =>
                Array.from(row.querySelectorAll('th,td')).map(cell => String(cell.textContent || '').trim())
            ).filter(row => row.some(cell => cell));

            if (!rows.length) return;

            const panelTitleEl = leftPanel.querySelector('h1, h2, h3, h4, h5, h6');
            const titleText = String(panelTitleEl?.textContent || '').trim();
            if (index === 0 && titleText) {
                sheetData.push([titleText]);
            } else if (index > 0) {
                sheetData.push([`Table ${index + 1}`]);
            }

            rows.forEach(row => sheetData.push(row));
            sheetData.push([]);
            hasExportData = true;
        });
    } else {
        const lines = String(leftPanel.innerText || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const isOnlyPrompt = lines.length === 0 || lines.every(line => /select .* to view|no data|not available|unable to load/i.test(line));
        if (!isOnlyPrompt) {
            sheetData.push(['Data']);
            lines.forEach(line => sheetData.push([line]));
            hasExportData = true;
        }
    }

    if (!hasExportData) {
        alert('No data available to export');
        return;
    }

    const insurerSelect = document.getElementById('insuranceInsurerSelect');
    const infoTypeSelect = document.getElementById('insuranceInfoTypeSelect');
    const insurerName = String(insurerSelect?.options?.[insurerSelect.selectedIndex]?.text || 'insurer')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
    const infoTypeName = String(infoTypeSelect?.options?.[infoTypeSelect.selectedIndex]?.text || 'data')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
    const safeSheetNameRaw = String(infoTypeSelect?.options?.[infoTypeSelect.selectedIndex]?.text || 'Insurance Data').trim();
    const safeSheetName = (safeSheetNameRaw || 'Insurance Data').slice(0, 31);

    const workbook = window.XLSX.utils.book_new();
    const worksheet = window.XLSX.utils.aoa_to_sheet(sheetData);
    window.XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

    window.XLSX.writeFile(workbook, `insurance_${infoTypeName}_${insurerName}.xlsx`);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInsuranceSolvencyRatioHandlers);
} else {
    bindInsuranceSolvencyRatioHandlers();
}
