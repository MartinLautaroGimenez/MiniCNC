import customtkinter as ctk

class JobView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, corner_radius=10, fg_color="transparent")
        
        self.grid_columnconfigure(0, weight=3) # Área visual predominante (3/4 de pantalla aprox)
        self.grid_columnconfigure(1, weight=1) # Barra de estado a la derecha (1/4 de pantalla aprox)
        self.grid_rowconfigure(1, weight=1)

        # Título
        self.title = ctk.CTkLabel(self, text="Visualización y Trabajo (G-Code)", font=ctk.CTkFont(size=20, weight="bold"))
        self.title.grid(row=0, column=0, columnspan=2, padx=20, pady=(0, 20), sticky="w")

        # --- ÁREA DE VISUALIZACIÓN (CANVAS MOCK) ---
        self.canvas_panel = ctk.CTkFrame(self, corner_radius=15, fg_color="#1a1a1a") # Muy oscuro parecido a 3D preview
        self.canvas_panel.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")

        # Mensaje placeholder en medio del canvas
        self.canvas_panel.grid_rowconfigure(0, weight=1)
        self.canvas_panel.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(self.canvas_panel, text="Vista Previa de Trayectoria (X/Y)\n\n(Añadir matplotlib chart\no dibujar lineas sobre Canvas después)", text_color="gray", font=ctk.CTkFont(size=14)).grid(row=0, column=0)

        # --- BARRA DE ACCIONES (DERECHA) ---
        self.actions_panel = ctk.CTkFrame(self, corner_radius=15)
        self.actions_panel.grid(row=1, column=1, padx=10, pady=10, sticky="nsew")

        ctk.CTkLabel(self.actions_panel, text="Control de Trabajo", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=20)

        self.btn_load = ctk.CTkButton(self.actions_panel, text="📂 Cargar G-Code", height=40, font=ctk.CTkFont(weight="bold"), fg_color="#3498DB", hover_color="#2980B9")
        self.btn_load.pack(padx=20, pady=10, fill="x")

        self.file_label = ctk.CTkLabel(self.actions_panel, text="Ningún archivo cargado.", text_color="gray", font=ctk.CTkFont(size=12))
        self.file_label.pack(padx=20, pady=0)

        ctk.CTkLabel(self.actions_panel, text="_"*30, text_color="gray").pack(pady=10) # Separador visual

        self.btn_play = ctk.CTkButton(self.actions_panel, text="▶️ Iniciar Trabajo", height=45, font=ctk.CTkFont(weight="bold"), fg_color="#2ECC71", hover_color="#27AE60")
        self.btn_play.pack(padx=20, pady=20, fill="x")

        self.btn_pause = ctk.CTkButton(self.actions_panel, text="⏸️ Pausa", height=40, font=ctk.CTkFont(weight="bold"), fg_color="#F1C40F", hover_color="#F39C12", text_color="black")
        self.btn_pause.pack(padx=20, pady=10, fill="x")

        self.btn_stop = ctk.CTkButton(self.actions_panel, text="⏹️ Detener", height=40, font=ctk.CTkFont(weight="bold"), fg_color="#E74C3C", hover_color="#C0392B")
        self.btn_stop.pack(padx=20, pady=10, fill="x")

        # Espaciador empuja lo de abajo hacia el final
        self.spacer = ctk.CTkFrame(self.actions_panel, fg_color="transparent")
        self.spacer.pack(fill="y", expand=True)

        # Progreso simulado al fondo
        self.progress_label = ctk.CTkLabel(self.actions_panel, text="Progreso: 0%", font=ctk.CTkFont(weight="bold"))
        self.progress_label.pack(pady=(10, 5))
        
        self.progressbar = ctk.CTkProgressBar(self.actions_panel, height=15)
        self.progressbar.pack(padx=20, pady=(5, 20), fill="x")
        self.progressbar.set(0)
