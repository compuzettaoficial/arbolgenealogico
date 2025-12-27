// Base de datos
let persons = [];
let relations = [];

// Cargar datos desde archivo JSON
async function loadDataFromJSON() {
  try {
    const response = await fetch('data/family-data.json');
    if (!response.ok) throw new Error('No se pudo cargar el archivo');
    
    const data = await response.json();
    persons = data.persons || [];
    relations = data.relations || [];
    
    // Guardar en localStorage como respaldo
    localStorage.setItem('familyPersons', JSON.stringify(persons));
    localStorage.setItem('familyRelations', JSON.stringify(relations));
    
    return true;
  } catch (error) {
    console.error('Error cargando JSON:', error);
    // Intentar cargar desde localStorage
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const savedPersons = localStorage.getItem('familyPersons');
  const savedRelations = localStorage.getItem('familyRelations');
  
  if (savedPersons && savedRelations) {
    persons = JSON.parse(savedPersons);
    relations = JSON.parse(savedRelations);
    return true;
  }
  
  return false;
}

async function loadData() {
  const loaded = await loadDataFromJSON();
  
  if (!loaded) {
    showMessage('No se encontraron datos. Por favor sube el archivo family-data.json', 'error');
  }
  
  renderPersonsList();
  renderRelationsList();
  updatePersonSelects();
  renderTree();
}

function saveData() {
  localStorage.setItem('familyPersons', JSON.stringify(persons));
  localStorage.setItem('familyRelations', JSON.stringify(relations));
}

// ===== SISTEMA DE IDs MEJORADO =====
function generatePersonId() {
  // Buscar el ID más alto con formato P####
  let maxId = 0;
  
  persons.forEach(person => {
    if (person.id && typeof person.id === 'string' && person.id.startsWith('P')) {
      const num = parseInt(person.id.substring(1));
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  
  // Generar nuevo ID: P#### con 4 dígitos
  const newId = 'P' + String(maxId + 1).padStart(4, '0');
  return newId;
}

// CRUD Personas
function savePerson(personData) {
  // Si no tiene ID o es temporal, generar uno nuevo
  if (!personData.id || personData.id === '' || personData.id.includes('person_') || personData.id.includes('_')) {
    personData.id = generatePersonId();
  }
  
  const existingIndex = persons.findIndex(p => p.id === personData.id);
  
  if (existingIndex >= 0) {
    // Actualizar existente
    persons[existingIndex] = personData;
    saveData();
    return { success: true, message: 'Persona actualizada correctamente' };
  } else {
    // Agregar nueva
    persons.push(personData);
    saveData();
    return { success: true, message: 'Persona creada con ID: ' + personData.id };
  }
}

function deletePerson(personId) {
  // Eliminar relaciones asociadas
  relations = relations.filter(r => 
    r.personId1 !== personId && r.personId2 !== personId
  );
  
  // Eliminar persona
  persons = persons.filter(p => p.id !== personId);
  
  saveData();
  return { success: true, message: 'Persona eliminada correctamente' };
}

// CRUD Relaciones
function saveRelation(relationData) {
  const isDuplicate = relations.some(r =>
    (r.personId1 === relationData.personId1 && 
     r.personId2 === relationData.personId2 && 
     r.type === relationData.type) ||
    (r.personId1 === relationData.personId2 && 
     r.personId2 === relationData.personId1 && 
     r.type === relationData.type)
  );
  
  if (isDuplicate) {
    return { success: false, message: 'Esta relación ya existe' };
  }
  
  relations.push(relationData);
  saveData();
  return { success: true, message: 'Relación creada correctamente' };
}

function deleteRelation(personId1, personId2, type) {
  relations = relations.filter(r =>
    !((r.personId1 === personId1 && r.personId2 === personId2 && r.type === type) ||
      (r.personId1 === personId2 && r.personId2 === personId1 && r.type === type))
  );
  
  saveData();
  return { success: true, message: 'Relación eliminada correctamente' };
}

// Utilidades
function getPersonById(id) {
  return persons.find(p => p.id === id);
}

function getSpouse(personId) {
  const relation = relations.find(r =>
    r.type === 'esposa' && (r.personId1 === personId || r.personId2 === personId)
  );
  
  if (!relation) return null;
  
  const spouseId = relation.personId1 === personId ? relation.personId2 : relation.personId1;
  return getPersonById(spouseId);
}

function getChildren(parentId) {
  return relations
    .filter(r => r.type === 'hijo' && r.personId1 === parentId)
    .map(r => getPersonById(r.personId2))
    .filter(p => p);
}

function getParents(childId) {
  return relations
    .filter(r => r.type === 'hijo' && r.personId2 === childId)
    .map(r => getPersonById(r.personId1))
    .filter(p => p);
}

function findRootPersons() {
  const personsWithParents = new Set();
  relations.forEach(r => {
    if (r.type === 'hijo') {
      personsWithParents.add(r.personId2);
    }
  });
  
  const roots = persons.filter(p => !personsWithParents.has(p.id));
  const rootGroups = [];
  const processed = new Set();
  
  roots.forEach(person => {
    if (processed.has(person.id)) return;
    
    const spouse = getSpouse(person.id);
    if (spouse && !personsWithParents.has(spouse.id)) {
      rootGroups.push({
        type: 'couple',
        person1: person,
        person2: spouse
      });
      processed.add(person.id);
      processed.add(spouse.id);
    }
  });
  
  roots.forEach(person => {
    if (!processed.has(person.id)) {
      const spouse = getSpouse(person.id);
      if (!spouse) {
        rootGroups.push({
          type: 'single',
          person: person
        });
        processed.add(person.id);
      }
    }
  });
  
  return rootGroups;
}

// Exportar datos actuales (desde navegador)
function exportCurrentData() {
  const dataStr = JSON.stringify({ 
    persons, 
    relations,
    exportDate: new Date().toISOString(),
    version: "2.0"
  }, null, 2);
  
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'family-data_' + new Date().toISOString().split('T')[0] + '.json';
  link.click();
  URL.revokeObjectURL(url);
  
  showMessage('Datos exportados correctamente', 'success');
}

// Importar archivo JSON desde navegador
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.persons && data.relations) {
        persons = data.persons;
        relations = data.relations;
        saveData();
        loadData();
        showMessage('Datos importados correctamente', 'success');
      } else {
        showMessage('Formato de archivo inválido', 'error');
      }
    } catch (error) {
      showMessage('Error al importar: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
}

// Limpiar IDs antiguos (migración)
function cleanupOldIds() {
  if (!confirm('¿Convertir todos los IDs largos a formato P####?\n\nEsto reemplazará IDs como "person_1754858312401_hkq1agnab" por "P0001", "P0002", etc.\n\n¿Continuar?')) {
    return;
  }
  
  let updated = 0;
  const idMap = {}; // Mapeo de IDs viejos a nuevos
  
  // Actualizar IDs en personas
  persons.forEach(person => {
    if (person.id && (person.id.length > 10 || person.id.includes('person_') || person.id.includes('_'))) {
      const newId = generatePersonId();
      idMap[person.id] = newId;
      person.id = newId;
      updated++;
    }
  });
  
  // Actualizar referencias en relaciones
  if (Object.keys(idMap).length > 0) {
    relations.forEach(relation => {
      if (idMap[relation.personId1]) {
        relation.personId1 = idMap[relation.personId1];
      }
      if (idMap[relation.personId2]) {
        relation.personId2 = idMap[relation.personId2];
      }
    });
  }
  
  saveData();
  showMessage(`IDs actualizados: ${updated}. Recargando...`, 'success');
  
  setTimeout(() => {
    location.reload();
  }, 2000);
}
