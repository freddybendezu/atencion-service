document.addEventListener("DOMContentLoaded", () => {
    // Referencias al DOM
    const mozosContainer = document.getElementById("mozos-container");
    const filtroEstado = document.getElementById("filtroEstado");
    const btnNuevoMozo = document.getElementById("btn-nuevo-mozo");
    const mozoModal = document.getElementById("mozo-modal");
    const closeModalBtn = document.querySelector(".close-btn");
    const btnCancelar = document.getElementById("btn-cancelar");
    const mozoForm = document.getElementById("mozo-form");

    // Event Listeners
    filtroEstado.addEventListener("change", cargarMozos);
    btnNuevoMozo.addEventListener("click", abrirModalCrear);
    closeModalBtn.addEventListener("click", cerrarModal);
    btnCancelar.addEventListener("click", cerrarModal);
    mozoForm.addEventListener("submit", guardarMozo);
    window.addEventListener("click", (e) => {
        if (e.target === mozoModal) {
            cerrarModal();
        }
    });

    cargarMozos();


    // --- CRUD FUNCIONES ---

    async function cargarMozos() {
        mozosContainer.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color: var(--muted);">Cargando mozos...</p>';
        
        try {
            const res = await fetch("/api/mozos");
            if (!res.ok) throw new Error("Error al obtener la lista de mozos");
            
            let mozos = await res.json();
            const filtro = filtroEstado.value;
            
            if (filtro !== 'todos') {
                const activo = filtro === 'activo';
                mozos = mozos.filter(m => m.activo === activo);
            }

            renderizarMozos(mozos);

        } catch (error) {
            console.error(error);
            mozosContainer.innerHTML = '<p class="error-msg">❌ Error al cargar los mozos. Revise la consola.</p>';
        }
    }

    function renderizarMozos(mozos) {
        mozosContainer.innerHTML = '';

        if (mozos.length === 0) {
            mozosContainer.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; padding: 20px;">No se encontraron mozos que coincidan con el filtro.</p>';
            return;
        }

        mozos.forEach(mozo => {
            const statusText = mozo.activo ? "ACTIVO" : "INACTIVO";
            const statusClass = mozo.activo ? "status-activo" : "status-inactivo";

            const card = document.createElement("div");
            card.className = "mozo-card";
            card.dataset.id = mozo.id;

            card.innerHTML = `
                <div class="mozo-header">
                    <div class="mozo-info-group">
                        <div class="mozo-nombre">${mozo.nombre}</div>
                        <div class="mozo-codigo">Código: ${mozo.codigo}</div>
                    </div>
                    <span class="mozo-status ${statusClass}">${statusText}</span>
                </div>
                <div class="mozo-actions">
                    <button class="action-btn btn-edit" data-id="${mozo.id}">
                        <span class="material-symbols-outlined">edit</span> Editar
                    </button>
                    <button class="action-btn btn-delete" data-id="${mozo.id}">
                        <span class="material-symbols-outlined">delete</span> Eliminar
                    </button>
                </div>
            `;
            mozosContainer.appendChild(card);
        });
        
        document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', abrirModalEditar));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', eliminarMozo));
    }


    // --- MODAL Y FORMULARIO ---

    function abrirModalCrear() {
        document.getElementById("modal-title").textContent = "Nuevo Mozo";
        document.getElementById("mozo-id").value = "";
        mozoForm.reset();
        mozoModal.style.display = "block";
    }

    async function abrirModalEditar(e) {
        const id = e.currentTarget.dataset.id;
        
        try {
            const res = await fetch("/api/mozos");
            const mozos = await res.json();
            const mozo = mozos.find(m => String(m.id) === String(id));
            
            if (mozo) {
                document.getElementById("modal-title").textContent = `Editar Mozo: ${mozo.nombre}`;
                document.getElementById("mozo-id").value = mozo.id;
                document.getElementById("nombre").value = mozo.nombre;
                document.getElementById("codigo").value = mozo.codigo;
                document.getElementById("activo").checked = mozo.activo;
                mozoModal.style.display = "block";
            }
        } catch (error) {
            console.error("Error al cargar datos para editar:", error);
        }
    }

    function cerrarModal() {
        mozoModal.style.display = "none";
        mozoForm.reset();
    }

    async function guardarMozo(e) {
        e.preventDefault();
        
        const mozoId = document.getElementById("mozo-id").value;
        
        const codigoInput = document.getElementById("codigo");
        codigoInput.value = codigoInput.value.toUpperCase();

        const mozoData = {
            id: mozoId || undefined,
            nombre: document.getElementById("nombre").value,
            codigo: codigoInput.value,
            activo: document.getElementById("activo").checked,
        };

        const btnGuardar = document.getElementById("btn-guardar");
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="material-symbols-outlined">sync</span> Guardando...';

        try {
            const res = await fetch("/api/mozo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mozoData),
            });

            if (!res.ok) throw new Error("Error al guardar el mozo");
            
            cerrarModal();
            cargarMozos();
            
        } catch (error) {
            alert(`Hubo un error al guardar: ${error.message}`);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar';
        }
    }

    async function eliminarMozo(e) {
        const id = e.currentTarget.dataset.id;
        const card = e.currentTarget.closest('.mozo-card');
        const nombre = card.querySelector('.mozo-nombre').textContent;

        if (confirm(`⚠️ ¿Está seguro de que desea ELIMINAR permanentemente a ${nombre}?`)) {
            try {
                const res = await fetch(`/api/mozo/${id}`, {
                    method: "DELETE",
                });

                if (!res.ok) throw new Error("Error al eliminar el mozo");
                
                card.style.opacity = '0.5';
                card.style.transition = 'opacity 0.5s';
                setTimeout(() => card.remove(), 500);
                
                cargarMozos();
                
            } catch (error) {
                alert(`Error al eliminar: ${error.message}`);
            }
        }
    }
});