// VARIABLES GLOBALES
let quill;
let currentNoteId = null;
let autoSaveTimer = null;

// CONFIGURACIÓN DE CATEGORÍAS
const defaultCategories = ["Matemáticas 📐", "Inglés 📚", "Ciencia 🔬", "Otros ⭐"];
let customCategories = [];
function rebuildCategorySelect() {
  const select = document.getElementById('noteCategory');
  select.innerHTML = "";
  defaultCategories.forEach(cat => {
    let option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  customCategories.forEach(cat => {
    let option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  let newOpt = document.createElement('option');
  newOpt.value = "nueva";
  newOpt.textContent = "Agregar nueva categoría...";
  select.appendChild(newOpt);
}
document.addEventListener("DOMContentLoaded", function() {
  const storedCats = localStorage.getItem('customCategories');
  if (storedCats) { customCategories = JSON.parse(storedCats); }
  rebuildCategorySelect();
});
document.getElementById('noteCategory').addEventListener('change', function(e) {
  if (this.value === 'nueva') {
    let nuevaCat = prompt("Ingresa el nombre de la nueva categoría (puedes incluir un emoji):");
    if (nuevaCat && nuevaCat.trim() !== "") {
      customCategories.push(nuevaCat);
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
      rebuildCategorySelect();
      this.value = nuevaCat;
    } else { 
      this.selectedIndex = 0;
    }
  }
});

// Modal de Categorías
function openCatModal() {
  populateCatModal();
  document.getElementById('catModal').style.display = 'flex';
}
function closeCatModal() { document.getElementById('catModal').style.display = 'none'; }
function populateCatModal() {
  const catList = document.getElementById('catList');
  catList.innerHTML = "";
  if (customCategories.length === 0) {
    catList.textContent = "No hay categorías personalizadas.";
  } else {
    customCategories.forEach((cat, index) => {
      const div = document.createElement('div');
      div.className = "cat-item";
      div.textContent = cat;
      const btn = document.createElement('button');
      btn.className = "delete-cat";
      btn.textContent = "🗑️";
      btn.onclick = function() {
        if (confirm(`¿Eliminar la categoría "${cat}"?`)) {
          customCategories.splice(index, 1);
          localStorage.setItem('customCategories', JSON.stringify(customCategories));
          rebuildCategorySelect();
          populateCatModal();
        }
      };
      div.appendChild(btn);
      catList.appendChild(div);
    });
  }
}

// Modal de Configuración
function openConfigModal() { document.getElementById('configModal').style.display = 'flex'; }
function closeConfigModal() { document.getElementById('configModal').style.display = 'none'; }

// Guardar Configuración de BD
function saveDBConfig() {
  const config = {
    host: document.getElementById('dbHost').value,
    user: document.getElementById('dbUser').value,
    pass: document.getElementById('dbPass').value,
    dbName: document.getElementById('dbName').value
  };
  localStorage.setItem('dbConfig', JSON.stringify(config));
  closeConfigModal();
  checkDBConnection();
}

// Comprobar conexión con la BD y actualizar indicador de sesión
async function checkDBConnection() {
  const dbConfig = JSON.parse(localStorage.getItem('dbConfig'));
  try {
    let response = await fetch('backend.php', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-DB-CONFIG': JSON.stringify(dbConfig)
      }
    });
    let result = await response.json();
    if (Array.isArray(result)) {
      document.getElementById('sessionIndicator').textContent = "✅";
      document.getElementById('logoutSection').style.display = 'block';
      loadNotes();
    } else {
      document.getElementById('sessionIndicator').textContent = "❌";
      document.getElementById('logoutSection').style.display = 'none';
    }
  } catch (error) {
    console.error("Error al comprobar la conexión:", error);
    document.getElementById('sessionIndicator').textContent = "❌";
    document.getElementById('logoutSection').style.display = 'none';
  }
}

// Función para descargar backup
async function downloadBackup() {
  const dbConfig = JSON.parse(localStorage.getItem('dbConfig'));
  try {
    let response = await fetch('backend.php', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-DB-CONFIG': JSON.stringify(dbConfig)
      }
    });
    let notas = await response.json();
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notas, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "backup_notas.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  } catch (error) {
    console.error("Error al descargar backup:", error);
  }
}

// Función para importar backup
function importBackup() {
  const fileInput = document.getElementById('backupFile');
  if (fileInput.files.length === 0) {
    alert("Por favor, selecciona un archivo de backup.");
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      let response = await fetch('import_backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: data, dbConfig: JSON.parse(localStorage.getItem('dbConfig')) })
      });
      let result = await response.json();
      if (result.mensaje) {
        alert("Backup importado correctamente.");
        loadNotes();
      } else {
        alert("Error al importar backup: " + result.error);
      }
    } catch (err) {
      console.error("Error al importar backup:", err);
      alert("El archivo seleccionado no es un backup válido.");
    }
  };
  reader.readAsText(file);
}

// Aplicar tema
function setTheme(theme) {
  if (theme === 'discord') {
    document.body.classList.add('discord-dark');
  } else {
    document.body.classList.remove('discord-dark');
  }
}

// Registro del blot para definiciones en Quill
const Inline = Quill.import('blots/inline');
class DefinitionBlot extends Inline {
  static create(value) {
    let node = super.create();
    node.setAttribute('data-definition', value);
    node.classList.add('definition');
    return node;
  }
  static formats(node) { return node.getAttribute('data-definition'); }
  format(name, value) {
    if (name === 'definition' && value) {
      this.domNode.setAttribute('data-definition', value);
    } else { super.format(name, value); }
  }
}
DefinitionBlot.blotName = 'definition';
DefinitionBlot.tagName = 'span';
Quill.register(DefinitionBlot);

// Configuración ampliada de la toolbar de Quill
const toolbarOptions = [
    [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ];
  

// Inline Toolbar para formato rápido (ya definido en HTML)
// Función para aplicar formato desde el inline toolbar
function applyInlineFormat(format) {
  const range = quill.getSelection();
  if (range) { quill.format(format, !quill.getFormat(range)[format]); }
}

// Auto-guardado: 5 segundos después del último cambio
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveCurrentNote();
      const indicator = document.getElementById('autosaveIndicator');
      indicator.style.display = 'inline';
      setTimeout(() => { indicator.style.display = 'none'; }, 2000);
    }, 5000);
  }
  

// Inicializar Quill y eventos
document.addEventListener("DOMContentLoaded", function() {
    quill = new Quill('#editor', {
        modules: { toolbar: toolbarOptions },
        theme: 'snow'
      });
      
  quill.on('text-change', scheduleAutoSave);
  quill.on('selection-change', function(range) {
    if (range && range.length > 0) {
      showInlineToolbar(range);
    } else {
      hideInlineToolbar();
    }
  });
  if (localStorage.getItem('dbConfig')) {
    checkDBConnection();
  } else {
    openConfigModal();
  }
  document.getElementById('editor').addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('definition')) {
      e.stopPropagation();
      showTooltip(e, e.target.getAttribute('data-definition'));
    }
  });
});

// Inline Toolbar: mostrar y ocultar
function showInlineToolbar(range) {
  const toolbar = document.getElementById('inlineToolbar');
  const bounds = quill.getBounds(range);
  toolbar.style.top = (bounds.top - 40) + "px";
  toolbar.style.left = bounds.left + "px";
  toolbar.style.display = "block";
}
function hideInlineToolbar() { document.getElementById('inlineToolbar').style.display = "none"; }

// Tooltip
function showTooltip(event, content) {
  const tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = content;
  tooltip.style.left = event.pageX + 'px';
  tooltip.style.top = event.pageY + 'px';
  tooltip.style.display = 'block';
  document.addEventListener('click', hideTooltip, { once: true });
}
function hideTooltip() { document.getElementById('tooltip').style.display = 'none'; }

// Nueva nota
function newNote() {
  currentNoteId = null;
  document.getElementById('noteTitle').value = "";
  document.getElementById('noteCategory').selectedIndex = 0;
  quill.setContents([]);
  quill.focus();
}

// Guardar nota (POST y PUT)
async function saveCurrentNote() {
  let contenido = quill.root.innerHTML;
  if (contenido.trim() === '<p><br></p>' || contenido.trim() === '') {
    alert("La nota está vacía");
    return;
  }
  let titulo = document.getElementById('noteTitle').value.trim();
  if (!titulo) {
    alert("Por favor, ingresa un título para la nota");
    return;
  }
  let categoria = document.getElementById('noteCategory').value;
  const noteData = { titulo, categoria, contenido };
  const dbConfig = JSON.parse(localStorage.getItem('dbConfig'));
  noteData.dbConfig = dbConfig;
  if (currentNoteId === null) {
    try {
      let response = await fetch('backend.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      let result = await response.json();
      if (result.mensaje) {
        currentNoteId = result.id;
        loadNotes();
      } else {
        alert("Error al guardar la nota: " + result.error);
      }
    } catch (error) {
      console.error("Error en POST:", error);
    }
  } else {
    noteData.id = currentNoteId;
    try {
      let response = await fetch('backend.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      let result = await response.json();
      if (result.mensaje) {
        loadNotes();
      } else {
        alert("Error al actualizar la nota: " + result.error);
      }
    } catch (error) {
      console.error("Error en PUT:", error);
    }
  }
}

// Cargar notas desde el backend
async function loadNotes() {
  const dbConfig = JSON.parse(localStorage.getItem('dbConfig'));
  try {
    let response = await fetch('backend.php', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-DB-CONFIG': JSON.stringify(dbConfig)
      }
    });
    let notas = await response.json();
    const groups = {};
    notas.forEach(nota => {
      if (!groups[nota.categoria]) groups[nota.categoria] = [];
      groups[nota.categoria].push(nota);
    });
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = "";
    for (let cat in groups) {
      const groupDiv = document.createElement('div');
      groupDiv.className = "category-group";
      const header = document.createElement('div');
      header.className = "category-header";
      header.textContent = cat;
      groupDiv.appendChild(header);
      groups[cat].forEach(nota => {
        const item = document.createElement('div');
        item.className = 'note-item';
        const info = document.createElement('div');
        info.className = "note-info";
        info.textContent = nota.titulo;
        item.appendChild(info);
        const delBtn = document.createElement('button');
        delBtn.className = "delete-note";
        delBtn.textContent = "🗑️";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm("¿Deseas eliminar esta nota?")) { deleteNote(nota.id); }
        };
        item.appendChild(delBtn);
        item.onclick = () => loadNote(nota.id, nota.titulo, nota.categoria, nota.contenido);
        groupDiv.appendChild(item);
      });
      notesList.appendChild(groupDiv);
    }
  } catch (error) {
    console.error("Error cargando notas:", error);
  }
}

// Cargar una nota en el editor
function loadNote(id, titulo, categoria, contenido) {
  currentNoteId = id;
  document.getElementById('noteTitle').value = titulo;
  document.getElementById('noteCategory').value = categoria;
  quill.root.innerHTML = contenido;
}

// Eliminar nota
async function deleteNote(id) {
  const dbConfig = JSON.parse(localStorage.getItem('dbConfig'));
  try {
    let response = await fetch('backend.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, dbConfig })
    });
    let result = await response.json();
    if (result.mensaje) {
      loadNotes();
    } else {
      alert("Error al eliminar la nota: " + result.error);
    }
  } catch (error) {
    console.error("Error en DELETE:", error);
  }
}

// Función para procesar URL de video (corregida)
function processVideoUrl(url) {
    // Expresión regular correcta para detectar URLs de YouTube
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
      return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    // Si no es de YouTube, se asume que es un video normal
    return `<video controls style="max-width:100%;"><source src="${url}" type="video/mp4">Tu navegador no soporta el video.</video>`;
  }
  
  // Función para agregar definición a la selección
  function addDefinition() {
    let range = quill.getSelection();
    if (range && range.length > 0) {
      // Preguntar el tipo de contenido para la definición
      let tipo = prompt("Tipo de contenido para la definición (texto, imagen, video, audio):", "texto");
      let contenidoDef = "";
      if (tipo === "imagen") {
        let url = prompt("Ingrese la URL de la imagen:");
        if (url) {
          contenidoDef = `<img src="${url}" alt="Imagen" style="max-width:100%;">`;
        }
      } else if (tipo === "video") {
        let url = prompt("Ingrese la URL del video:");
        if (url) {
          contenidoDef = processVideoUrl(url);
        }
      } else if (tipo === "audio") {
        let url = prompt("Ingrese la URL del audio:");
        if (url) {
          contenidoDef = `<audio controls style="max-width:100%;"><source src="${url}" type="audio/mpeg">Tu navegador no soporta el audio.</audio>`;
        }
      } else {
        contenidoDef = prompt("Ingrese la definición o contenido de la nota:");
      }
      if (!contenidoDef) return;
      // Se aplica el formato 'definition' a la selección
      quill.formatText(range.index, range.length, 'definition', contenidoDef);
    } else {
      alert("Por favor, selecciona el texto al que deseas agregar la definición.");
    }
  }
  
  // Manejador de clics en el editor para mostrar el tooltip con la definición
  document.getElementById('editor').addEventListener('click', function(e) {
    // Usamos .closest() para buscar el ancestro con la clase 'definition'
    const defElem = e.target.closest('.definition');
    if (defElem) {
      e.stopPropagation();
      showTooltip(e, defElem.getAttribute('data-definition'));
    }
  });
  
  // Función para mostrar el tooltip (igual que antes)
  function showTooltip(event, content) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = content;
    tooltip.style.left = event.pageX + "px";
    tooltip.style.top = event.pageY + "px";
    tooltip.style.display = "block";
    document.addEventListener('click', hideTooltip, { once: true });
  }
  function hideTooltip() {
    document.getElementById('tooltip').style.display = "none";
  }
  
  