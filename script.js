document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('exportJson').addEventListener('click', exportJson);
document.getElementById('mergeFileInput').addEventListener('change', handleMergeFile);
document.getElementById('mergeJson').addEventListener('click', mergeJsonData);
document.getElementById('jsonDisplay').addEventListener('input', updateJsonFromEditor);

let jsonData = {};
let incomingJsonData = {};
let visibleAttributes = [];
let visibleMergeAttributes = [];

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            jsonData = JSON.parse(e.target.result);
            generateAttributeSelector();
        } catch (error) {
            alert('Invalid JSON file');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

function handleMergeFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            incomingJsonData = JSON.parse(e.target.result);
            generateMergeSelector();
        } catch (error) {
            alert(`Invalid JSON file:\n${error.message}`);
        }
    };
    reader.readAsText(file);
}

function generateMergeSelector() {
    const container = document.getElementById('mergeSelectorContainer');
    container.innerHTML = '';

    const sampleObject = Object.values(incomingJsonData)[0];
    if (!sampleObject) return;

    for(const attr of Object.keys(sampleObject)) {
        if (!visibleMergeAttributes.includes(attr)) {
            visibleMergeAttributes.push(attr);
        }

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = attr;
        checkbox.checked = true;

        checkbox.addEventListener('change', function () {
            if (this.checked) {
                if (!visibleMergeAttributes.includes(attr)) {
                    visibleMergeAttributes.push(attr);
                }
            } else {
                visibleMergeAttributes = visibleMergeAttributes.filter(a => a !== attr);
            }
            updateJsonView();
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + attr));
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    }

    updateJsonView();
}

function mergeJsonData() {
    let overwrite = {};

    for(const [key, newValue] of Object.entries(incomingJsonData)) {
        for(const [attr, val] of Object.entries(newValue)) {
            if (!jsonData[key].hasOwnProperty(attr)) {
                jsonData[key][attr] = val;
                continue;
            }
            if (overwrite[attr] = overwrite[attr] ?? confirm(`Attribute '${attr}' already exists. Overwrite with new values?`)) {
                jsonData[key][attr] = val;
            }
        }
    }

    document.getElementById('mergeFileInput').value = '';
    document.getElementById('mergeSelectorContainer').innerHTML = '';
    visibleMergeAttributes = [];

    generateAttributeSelector();
    updateJsonView();
    incomingJsonData = {};
}

function generateAttributeSelector() {
    const container = document.getElementById('dataSelectorContainer');
    container.innerHTML = '';

    const sampleObject = Object.values(jsonData)[0];
    if (!sampleObject) return;

    for(const attr of Object.keys(sampleObject)) {
        if (!visibleAttributes.includes(attr)) {
            visibleAttributes.push(attr);
        }

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = attr;
        checkbox.checked = true;

        checkbox.addEventListener('change', function () {
            if (this.checked) {
                if (!visibleAttributes.includes(attr)) {
                    visibleAttributes.push(attr);
                }
            } else {
                visibleAttributes = visibleAttributes.filter(a => a !== attr);
            }
            updateJsonView();
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + attr));
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    }

    updateJsonView();
}

function updateJsonView() {
    const filteredData = {};
    for (const [key, value] of Object.entries(jsonData)) {
        const mergeIndex = incomingJsonData[key] ?? {};
        const filteredEntry = {};
        for (const [attr, val] of [...Object.entries(value), ...Object.entries(mergeIndex)]) {
            if (visibleAttributes.includes(attr))
                filteredEntry[attr] = val;
            else if (visibleMergeAttributes.includes(attr))
                filteredEntry[attr] = incomingJsonData[key]?.[attr] ?? val;
        }

        if (Object.keys(filteredEntry).length > 0) {
            filteredData[key] = filteredEntry;
        }
    }

    document.getElementById('jsonDisplay').textContent = JSON.stringify(filteredData, null, 2);
}

function updateJsonFromEditor() {
    try {
        const editedJson = JSON.parse(document.getElementById('jsonDisplay').textContent);
        Object.entries(editedJson).forEach(([key, value]) => {
            Object.entries(value).forEach(([attr, attrValue]) => {
                if (visibleAttributes.includes(attr)) {
                    jsonData[key][attr] = attrValue;
                } else if (visibleMergeAttributes.includes(attr)) {
                    incomingJsonData[key][attr] = attrValue;
                }
            });
        });
    } catch (error) {
        console.warn("Invalid JSON syntax", error);
    }
}

async function exportJson() {
    const filteredData = Object.fromEntries(
        Object.entries(jsonData).map(([key, value]) => [
            key,
            Object.fromEntries(
                Object.entries(value).filter(([attr]) => visibleAttributes.includes(attr) || visibleMergeAttributes.includes(attr))
            )
        ])
    );

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'filtered_data.json',
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' }));
        await writable.close();
    } catch (error) {
        console.error('File save cancelled or failed:', error);
    }
}