// Base de datos local (puedes conectar con Google Sheets API después)
let persons = [];
let relations = [];

// Datos de ejemplo iniciales
const INITIAL_DATA = {
  persons: [
    {
      id: 'P0001',
      nombre: 'Custodio',
      apellidos: 'Manrique Pinedo',
      genero: 'Masculino',
      fechaNacimiento: '',
      lugarNacimiento: '',
      fechaMuerte: '',
      notas: '',
      photo: ''
    },
    {
      id: 'P0002',
      nombre: 'Leonor',
      apellidos: 'Alvarado Fortalatino',
      genero: 'Femenino',
      fechaNacimiento: '',
      lugarNacimiento: '',
      fechaMuerte: '',
      notas: '',
      photo: ''
    },
    {
      id: 'P0003',
      nombre: 'Mario',
      apellidos: 'Manrique Alvarado',
      genero: 'Masculino',
      fechaNacimiento: '',
      lugarNacimiento: '',
      fechaMuerte: '',
      notas: '',
      photo: ''
    }
  ],
  relations: [
    { personId1: 'P0001', personId2: 'P0002', type: 'esposa' },
    { personId1: 'P0001', personId2: 'P0003', type: 'hijo' },
    { personId1: 'P0002', personId2: 'P0003', type: 'hijo' }
  ]
};

// Inicializar datos
function initializeData() {
  const savedPersons = localStorage.getItem('familyPersons');
  const savedRelations = localStorage.getItem('familyRelations');
  
  if (savedPersons && savedRelations) {
    persons = JSON.parse(savedPersons);
    relations = JSON.parse(savedRelations);
  } else {
    persons = [...INITIAL_DATA.persons];
    relations = [...INITIAL_DATA.relations];
    saveData();
  }
}

function saveData() {
  localStorage.setItem('familyPersons', JSON.stringify(persons));
  localStorage.setItem('familyRelations', JSON.stringify(relations));
}

function loadData() {
  initializeData();
  renderPersonsList();
  renderRelationsList();
  updatePersonSelects();
  renderTree();
}

// CRUD Personas
function savePerson(personData) {
  const existingIndex = persons.findIndex(p => p.id === personData.id);
  
  if (existingIndex >= 0) {
    persons[existingIndex] = personData;
  } else {
    personData.id = generateId('P');
    persons.push(personData);
  }
  
  saveData();
  return { success: true, message: 'Persona guardada correctamente' };
}

function deletePerson(personId) {
  // Eliminar relaciones asociadas
  relations = relations.filter(r => 
    r.personId1 !== personId && r.personId2 !== personId
  );
  
  // Eliminar persona
  persons = persons.filter(p => p.id !== personId);
  
  saveData();
  return { success: true, message: 'Persona eliminada' };
}

// CRUD Relaciones
function saveRelation(relationData) {
  // Verificar duplicados
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
  return { success: true, message: 'Relación eliminada' };
}

// Utilidades
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}_${random}`;
}

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

// Exportar datos
function exportData() {
  const dataStr = JSON.stringify({ persons, relations }, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'arbol-genealogico.json';
  link.click();
}

// Importar datos
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
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
