// Elementos del DOM
const treeContainer = document.getElementById('treeContainer');
const personForm = document.getElementById('personForm');
const relationForm = document.getElementById('relationForm');
const personsList = document.getElementById('personsList');
const relationsList = document.getElementById('relationsList');

// Estado del árbol
let treeScale = 1;
let expandedNodes = new Set();

// Configurar event listeners para admin
if (personForm) {
  personForm.addEventListener('submit', handlePersonSubmit);
  document.getElementById('clearPersonForm').addEventListener('click', clearPersonForm);
}

if (relationForm) {
  relationForm.addEventListener('submit', handleRelationSubmit);
}

// Controles del árbol
document.getElementById('zoomIn').addEventListener('click', () => {
  treeScale = Math.min(treeScale + 0.1, 2);
  updateTreeScale();
});

document.getElementById('zoomOut').addEventListener('click', () => {
  treeScale = Math.max(treeScale - 0.1, 0.5);
  updateTreeScale();
});

document.getElementById('resetZoom').addEventListener('click', () => {
  treeScale = 1;
  updateTreeScale();
});

document.getElementById('expandAll').addEventListener('click', () => {
  persons.forEach(p => {
    expandedNodes.add(p.id);
    const spouse = getSpouse(p.id);
    if (spouse) expandedNodes.add(`${p.id}-${spouse.id}`);
  });
  renderTree();
});

document.getElementById('collapseAll').addEventListener('click', () => {
  expandedNodes.clear();
  renderTree();
});

function updateTreeScale() {
  treeContainer.style.transform = `scale(${treeScale})`;
  treeContainer.style.transformOrigin = 'top left';
}

// FORMULARIO PERSONAS
function handlePersonSubmit(e) {
  e.preventDefault();
  
  if (!isAdmin()) {
    showMessage('No tienes permisos', 'error');
    return;
  }
  
  const personData = {
    id: document.getElementById('personId').value,
    nombre: document.getElementById('nombre').value.trim(),
    apellidos: document.getElementById('apellidos').value.trim(),
    genero: document.getElementById('genero').value,
    fechaNacimiento: document.getElementById('fechaNacimiento').value,
    lugarNacimiento: document.getElementById('lugarNacimiento').value.trim(),
    fechaMuerte: document.getElementById('fechaMuerte').value,
    notas: document.getElementById('notas').value.trim(),
    photo: document.getElementById('photoUrl').value.trim()
  };
  
  const result = savePerson(personData);
  showMessage(result.message, result.success ? 'success' : 'error');
  
  if (result.success) {
    clearPersonForm();
    loadData();
  }
}

function clearPersonForm() {
  personForm.reset();
  document.getElementById('personId').value = '';
}

function editPerson(personId) {
  const person = getPersonById(personId);
  if (!person) return;
  
  document.getElementById('personId').value = person.id;
  document.getElementById('nombre').value = person.nombre;
  document.getElementById('apellidos').value = person.apellidos;
  document.getElementById('genero').value = person.genero;
  document.getElementById('fechaNacimiento').value = person.fechaNacimiento || '';
  document.getElementById('lugarNacimiento').value = person.lugarNacimiento || '';
  document.getElementById('fechaMuerte').value = person.fechaMuerte || '';
  document.getElementById('notas').value = person.notas || '';
  document.getElementById('photoUrl').value = person.photo || '';
  
  personForm.scrollIntoView({ behavior: 'smooth' });
}

function handleDeletePerson(personId) {
  const person = getPersonById(personId);
  if (!confirm(`¿Eliminar a ${person.nombre} ${person.apellidos}?`)) return;
  
  const result = deletePerson(personId);
  showMessage(result.message, result.success ? 'success' : 'error');
  
  if (result.success) {
    loadData();
  }
}

// FORMULARIO RELACIONES
function handleRelationSubmit(e) {
  e.preventDefault();
  
  if (!isAdmin()) {
    showMessage('No tienes permisos', 'error');
    return;
  }
  
  const relationData = {
    personId1: document.getElementById('person1').value,
    personId2: document.getElementById('person2').value,
    type: document.getElementById('relationType').value
  };
  
  if (relationData.personId1 === relationData.personId2) {
    showMessage('No puedes relacionar una persona consigo misma', 'error');
    return;
  }
  
  const result = saveRelation(relationData);
  showMessage(result.message, result.success ? 'success' : 'error');
  
  if (result.success) {
    relationForm.reset();
    loadData();
  }
}

function handleDeleteRelation(personId1, personId2, type) {
  if (!confirm('¿Eliminar esta relación?')) return;
  
  const result = deleteRelation(personId1, personId2, type);
  showMessage(result.message, result.success ? 'success' : 'error');
  
  if (result.success) {
    loadData();
  }
}

// RENDERIZAR LISTAS (ADMIN)
function renderPersonsList() {
  if (!personsList) return;
  
  if (persons.length === 0) {
    personsList.innerHTML = '<p style="color: #999; margin-top: 20px;">No hay personas registradas</p>';
    return;
  }
  
  let html = '<h3>Personas registradas (' + persons.length + ')</h3>';
  
  persons.forEach(person => {
    const birthYear = person.fechaNacimiento ? new Date(person.fechaNacimiento).getFullYear() : '?';
    const deathYear = person.fechaMuerte ? ' - ' + new Date(person.fechaMuerte).getFullYear() : '';
    
    html += `
      <div class="item">
        <div class="item-info">
          <div class="item-name">${person.nombre} ${person.apellidos}</div>
          <div class="item-details">
            ${person.genero} • ${birthYear}${deathYear}
            ${person.lugarNacimiento ? ' • ' + person.lugarNacimiento : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-secondary" onclick="editPerson('${person.id}')">✏️ Editar</button>
          <button class="btn-danger" onclick="handleDeletePerson('${person.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  });
  
  personsList.innerHTML = html;
}

function renderRelationsList() {
  if (!relationsList) return;
  
  if (relations.length === 0) {
    relationsList.innerHTML = '<p style="color: #999; margin-top: 20px;">No hay relaciones registradas</p>';
    return;
  }
  
  let html = '<h3>Relaciones registradas (' + relations.length + ')</h3>';
  
  relations.forEach(relation => {
    const person1 = getPersonById(relation.personId1);
    const person2 = getPersonById(relation.personId2);
    
    if (!person1 || !person2) return;
    
    const typeText = relation.type === 'esposa' ? '💑 Matrimonio' : '👶 Padre/Hijo';
    
    html += `
      <div class="item">
        <div class="item-info">
          <div class="item-name">${person1.nombre} ${person1.apellidos}</div>
          <div class="item-details">${typeText} con ${person2.nombre} ${person2.apellidos}</div>
        </div>
        <div class="item-actions">
          <button class="btn-danger" onclick="handleDeleteRelation('${relation.personId1}','${relation.personId2}','${relation.type}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  });
  
  relationsList.innerHTML = html;
}

function updatePersonSelects() {
  const selects = ['person1', 'person2'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar persona...</option>';
    
    persons.forEach(person => {
      select.innerHTML += `
        <option value="${person.id}">${person.nombre} ${person.apellidos}</option>
      `;
    });
  });
}

// ===== RENDERIZAR ÁRBOL VISUAL - NUEVA LÓGICA CORREGIDA =====
function renderTree() {
  if (!treeContainer) return;
  
  treeContainer.innerHTML = '';
  
  if (persons.length === 0) {
    treeContainer.innerHTML = '<div style="text-align: center; padding: 100px; color: #999;">No hay personas en el árbol genealógico</div>';
    return;
  }
  
  const roots = findRootPersons();
  
  if (roots.length === 0) {
    treeContainer.innerHTML = '<div style="text-align: center; padding: 100px; color: #999;">No se encontraron personas raíz</div>';
    return;
  }
  
  let yOffset = 50;
  
  roots.forEach((root, index) => {
    if (index > 0) yOffset += 50;
    
    if (root.type === 'couple') {
      yOffset = renderCouple(root.person1, root.person2, 100, yOffset);
    } else {
      yOffset = renderSinglePerson(root.person, 100, yOffset);
    }
    
    yOffset += 100;
  });
}

// NUEVA FUNCIÓN: Determinar el orden correcto de una pareja
function getCorrectCoupleOrder(person1, person2) {
  const parents1 = getParents(person1.id);
  const parents2 = getParents(person2.id);
  
  // El que tiene padres es el descendiente directo
  if (parents1.length > 0 && parents2.length === 0) {
    return { descendant: person1, spouse: person2 };
  } else if (parents2.length > 0 && parents1.length === 0) {
    return { descendant: person2, spouse: person1 };
  } else {
    // Ambos tienen padres o ninguno tiene, mantener orden
    return { descendant: person1, spouse: person2 };
  }
}

function renderCouple(person1, person2, x, y) {
  // CORREGIR EL ORDEN: El descendiente va primero
  const { descendant, spouse } = getCorrectCoupleOrder(person1, person2);
  
  const children = getCombinedChildren(descendant.id, spouse.id);
  const hasChildren = children.length > 0;
  
  // Dibujar descendiente primero (izquierda)
  createPersonNode(descendant, x, y, hasChildren);
  
  // Dibujar esposa/esposo (derecha)
  createPersonNode(spouse, x + 220, y, hasChildren);
  
  // Línea de matrimonio
  createConnector(x + 200, y + 60, x + 220, y + 60);
  
  let maxY = y + 150;
  
  // Dibujar hijos
  if (hasChildren) {
    const coupleId = `${descendant.id}-${spouse.id}`;
    const isExpanded = expandedNodes.has(coupleId) || expandedNodes.has(descendant.id);
    
    if (isExpanded) {
      const childrenY = y + 200;
      const totalWidth = children.length * 220;
      let childX = x + 110 - (totalWidth / 2) + 110;
      
      children.forEach((child, index) => {
        // Línea al hijo
        createConnector(x + 210, y + 100, childX + 100, childrenY);
        
        const childSpouse = getSpouse(child.id);
        let childMaxY;
        
        if (childSpouse) {
          childMaxY = renderCouple(child, childSpouse, childX, childrenY);
        } else {
          childMaxY = renderSinglePerson(child, childX, childrenY);
        }
        
        maxY = Math.max(maxY, childMaxY);
        childX += 220;
      });
    }
  }
  
  return maxY;
}

function renderSinglePerson(person, x, y) {
  const children = getChildren(person.id);
  const hasChildren = children.length > 0;
  
  createPersonNode(person, x, y, hasChildren);
  
  let maxY = y + 150;
  
  if (hasChildren) {
    const isExpanded = expandedNodes.has(person.id);
    
    if (isExpanded) {
      const childrenY = y + 200;
      const totalWidth = children.length * 220;
      let childX = x - (totalWidth / 2) + 110;
      
      children.forEach(child => {
        createConnector(x + 100, y + 100, childX + 100, childrenY);
        
        const childSpouse = getSpouse(child.id);
        let childMaxY;
        
        if (childSpouse) {
          childMaxY = renderCouple(child, childSpouse, childX, childrenY);
        } else {
          childMaxY = renderSinglePerson(child, childX, childrenY);
        }
        
        maxY = Math.max(maxY, childMaxY);
        childX += 220;
      });
    }
  }
  
  return maxY;
}

function createPersonNode(person, x, y, hasChildren) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  
  const genderClass = person.genero === 'Masculino' ? 'node-gender-male' : 'node-gender-female';
  const genderIcon = person.genero === 'Masculino' ? '👨' : '👩';
  
  const birthYear = person.fechaNacimiento ? new Date(person.fechaNacimiento).getFullYear() : '';
  const deathYear = person.fechaMuerte ? ' - ' + new Date(person.fechaMuerte).getFullYear() : '';
  
  const avatar = person.photo ? 
    `<img src="${person.photo}" alt="${person.nombre}" onerror="this.style.display='none'; this.nextSibling.style.display='flex';">
     <div style="display: none;">${genderIcon}</div>` :
    genderIcon;
  
  node.innerHTML = `
    <div class="node-card ${genderClass}">
      <div class="node-avatar">${avatar}</div>
      <div class="node-name">${person.nombre} ${person.apellidos}</div>
      <div class="node-info">${birthYear}${deathYear}</div>
    </div>
  `;
  
  if (hasChildren) {
    node.style.cursor = 'pointer';
    node.onclick = (e) => {
      e.stopPropagation();
      const spouse = getSpouse(person.id);
      const coupleId = spouse ? `${person.id}-${spouse.id}` : person.id;
      
      if (expandedNodes.has(coupleId)) {
        expandedNodes.delete(coupleId);
      } else {
        expandedNodes.add(coupleId);
      }
      renderTree();
    };
  }
  
  treeContainer.appendChild(node);
}

function createConnector(x1, y1, x2, y2) {
  const line = document.createElement('div');
  line.style.position = 'absolute';
  line.style.backgroundColor = '#e0e0e0';
  line.style.zIndex = '1';
  
  if (x1 === x2) {
    // Línea vertical
    line.style.left = x1 + 'px';
    line.style.top = Math.min(y1, y2) + 'px';
    line.style.width = '2px';
    line.style.height = Math.abs(y2 - y1) + 'px';
  } else {
    // Línea horizontal
    line.style.left = Math.min(x1, x2) + 'px';
    line.style.top = y1 + 'px';
    line.style.width = Math.abs(x2 - x1) + 'px';
    line.style.height = '2px';
  }
  
  treeContainer.appendChild(line);
}

function getCombinedChildren(parentId1, parentId2) {
  const children1 = getChildren(parentId1);
  const children2 = getChildren(parentId2);
  
  const combined = [...children1];
  children2.forEach(child => {
    if (!combined.find(c => c.id === child.id)) {
      combined.push(child);
    }
  });
  
  return combined;
}
