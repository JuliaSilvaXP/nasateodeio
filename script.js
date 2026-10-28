// 1. IMPORTAÇÕES CORRIGIDAS (Todas via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// 2. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC8Q7Kfh5NTI5XnAIjGK6Q-dl6LWUwKr9s",
  authDomain: "nuvem2-juh.firebaseapp.com",
  projectId: "nuvem2-juh",
  storageBucket: "nuvem2-juh.firebasestorage.app",
  messagingSenderId: "441201660708",
  appId: "1:441201660708:web:f165596565f53dd49ad9b1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. AQUI ESTÁ A CORREÇÃO DO NOME DA COLEÇÃO
const colecaoEspaco = collection(db, "Espaco"); 

// 4. INTEGRAÇÃO COM A API DA NASA
async function buscarAPOD() {
  // Mudança 1: Usar o novo endpoint oficial
  const url = `https://science.nasa.gov/wp-json/wp/v2/apod-basic`;
  
  try {
    const resposta = await fetch(url);
    let dados = await resposta.json();
    
    // Mudança 2: O novo endpoint retorna uma lista, pegar o primeiro
    if (Array.isArray(dados) && dados.length > 0) {
      dados = dados[0];
    } else {
      throw new Error("Formato de dados inesperado");
    }
    
    const imgElement = document.getElementById('apod-image');
    const titleElement = document.getElementById('apod-title');
    const descElement = document.getElementById('apod-desc');

    // Definir título e descrição (a descrição pode conter tags HTML, usar innerHTML)
    titleElement.textContent = dados.title;
    descElement.innerHTML = dados.explanation;

    // Mudança 3: Usar hdurl para obter a imagem real
    const imageUrl = dados.hdurl || dados.url;
    
    if (dados.media_type === "image" && imageUrl) {
        imgElement.src = imageUrl;
        imgElement.style.display = 'block';
    } else if (dados.media_type === "video") {
        imgElement.style.display = 'none';
        titleElement.innerHTML = `
            ${dados.title} <br>
            <small style="color: #a0a0b0; font-weight: normal; font-size: 0.9rem;">
                (A mídia de hoje é um vídeo. 
                <a href="${dados.url}" target="_blank" style="color: #d8b4fe; text-decoration: underline;">Clique aqui para assistir</a>)
            </small>
        `;
    } else {
        imgElement.style.display = 'none';
        titleElement.innerHTML = `${dados.title} <br><small style="color: #a0a0b0;">(Não foi possível exibir a mídia de hoje)</small>`;
        console.warn("Tipo de mídia não suportado:", dados);
    }

  } catch (erro) {
    console.error("Erro ao buscar APOD:", erro);
    document.getElementById('apod-title').textContent = "Erro ao carregar a imagem do dia. Tente novamente mais tarde.";
    document.getElementById('apod-image').style.display = 'none';
  }
}

let idEditando = null;

// CREATE / UPDATE (Salvar)
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const descricao = document.getElementById('descricao').value;

    try {
        if (idEditando) {
            // Atualiza o documento usando o ID guardado
            const docRef = doc(db, "Espaco", idEditando); // Corrigido para "Espaco"
            await updateDoc(docRef, { titulo, categoria, descricao });
            
            idEditando = null; 
            document.querySelector('.btn-primary').textContent = "Salvar no Diário";
        } else {
            // Cria um novo documento na coleção "Espaco"
            await addDoc(colecaoEspaco, {
                titulo: titulo,
                categoria: categoria,
                descricao: descricao,
                dataCriacao: new Date()
            });
        }
        
        document.getElementById('registro-form').reset();
        carregarRegistros();
        
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao salvar o registro. Verifique o console (F12).");
    }
});

// READ (Listar)
async function carregarRegistros() {
    const listaDiv = document.getElementById('lista-registros');
    listaDiv.innerHTML = '<p class="empty-state">Buscando registros...</p>';

    try {
        // Busca os dados da coleção "Espaco"
        const querySnapshot = await getDocs(colecaoEspaco); 
        listaDiv.innerHTML = '';

        if (querySnapshot.empty) {
            listaDiv.innerHTML = '<p class="empty-state">Nenhum registro encontrado. Comece adicionando um acima!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const id = doc.id;
            const card = document.createElement('div');
            card.className = 'registro-item';
            card.innerHTML = `
                <div class="registro-info">
                    <h3>${dados.titulo}</h3>
                    <span class="categoria">${dados.categoria}</span>
                    <p>${dados.descricao}</p>
                </div>
                <div class="acoes">
                    <button class="btn-acao btn-editar" data-id="${id}">Editar</button>
                    <button class="btn-acao btn-excluir" data-id="${id}">Excluir</button>
                </div>
            `;
            listaDiv.appendChild(card);
        });
        
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => prepararEdicao(e.target.dataset.id));
        });
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => excluirRegistro(e.target.dataset.id));
        });

    } catch (erro) {
        console.error("Erro ao listar:", erro);
        listaDiv.innerHTML = '<p class="empty-state">Erro ao carregar os registros.</p>';
    }
}

// UPDATE (Preparar Edição)
async function prepararEdicao(id) {
    try {
        const querySnapshot = await getDocs(colecaoEspaco);
        querySnapshot.forEach((doc) => {
            if (doc.id === id) {
                const dados = doc.data();
                document.getElementById('titulo').value = dados.titulo;
                document.getElementById('categoria').value = dados.categoria;
                document.getElementById('descricao').value = dados.descricao;
                
                idEditando = id; 
                document.querySelector('.btn-primary').textContent = "Atualizar Registro";
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    } catch (erro) {
        console.error("Erro ao preparar edição:", erro);
    }
}

// DELETE (Excluir)
async function excluirRegistro(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
        try {
            await deleteDoc(doc(db, "Espaco", id)); // Corrigido para "Espaco"
            carregarRegistros();
        } catch (erro) {
            console.error("Erro ao excluir:", erro);
        }
    }
}

// 6. INICIALIZAÇÃO DA PÁGINA
window.onload = () => {
    buscarAPOD();
    carregarRegistros();
};

console.log("Dados da NASA:", dados); 