import customtkinter as ctk

class JogView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, corner_radius=10, fg_color="transparent")
        
        # Configurar para que la grilla ocupe el espacio
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # Título
        self.title = ctk.CTkLabel(self, text="Control Manual (Jog)", font=ctk.CTkFont(size=20, weight="bold"))
        self.title.grid(row=0, column=0, columnspan=2, padx=20, pady=(0, 20), sticky="w")

        # --- PANEL IZQUIERDO: EJES X e Y ---
        self.xy_panel = ctk.CTkFrame(self, corner_radius=15)
        self.xy_panel.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.xy_panel, text="Ejes X / Y", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, columnspan=3, pady=10)
        
        # D-pad en grilla 3x3
        self.btn_y_pos = ctk.CTkButton(self.xy_panel, text="Y+", width=70, height=70, font=ctk.CTkFont(size=18, weight="bold"))
        self.btn_y_pos.grid(row=1, column=1, padx=5, pady=5)
        
        self.btn_x_neg = ctk.CTkButton(self.xy_panel, text="X-", width=70, height=70, font=ctk.CTkFont(size=18, weight="bold"))
        self.btn_x_neg.grid(row=2, column=0, padx=5, pady=5)
        
        self.btn_home_xy = ctk.CTkButton(self.xy_panel, text="🏠 XY", width=70, height=70, fg_color="#E74C3C", hover_color="#C0392B", font=ctk.CTkFont(size=16, weight="bold"))
        self.btn_home_xy.grid(row=2, column=1, padx=5, pady=5)
        
        self.btn_x_pos = ctk.CTkButton(self.xy_panel, text="X+", width=70, height=70, font=ctk.CTkFont(size=18, weight="bold"))
        self.btn_x_pos.grid(row=2, column=2, padx=5, pady=5)
        
        self.btn_y_neg = ctk.CTkButton(self.xy_panel, text="Y-", width=70, height=70, font=ctk.CTkFont(size=18, weight="bold"))
        self.btn_y_neg.grid(row=3, column=1, padx=5, pady=5)

        # Centrar el D-Pad adaptativamente
        for i in range(3):
            self.xy_panel.grid_columnconfigure(i, weight=1)
        self.xy_panel.grid_rowconfigure(4, weight=1)

        # --- PANEL DERECHO: EJE Z y SETTINGS ---
        self.z_panel = ctk.CTkFrame(self, corner_radius=15)
        self.z_panel.grid(row=1, column=1, padx=10, pady=10, sticky="nsew")

        ctk.CTkLabel(self.z_panel, text="Eje Z", font=ctk.CTkFont(weight="bold")).pack(pady=10)

        # Botones Z
        self.btn_z_pos = ctk.CTkButton(self.z_panel, text="Z+ (Subir)", width=120, height=50, font=ctk.CTkFont(size=14, weight="bold"))
        self.btn_z_pos.pack(pady=15)

        self.btn_home_z = ctk.CTkButton(self.z_panel, text="🏠 Z", width=120, height=50, fg_color="#E74C3C", hover_color="#C0392B", font=ctk.CTkFont(size=14, weight="bold"))
        self.btn_home_z.pack(pady=10)

        self.btn_z_neg = ctk.CTkButton(self.z_panel, text="Z- (Bajar)", width=120, height=50, font=ctk.CTkFont(size=14, weight="bold"))
        self.btn_z_neg.pack(pady=15)

        # Controles de paso / Feedrate (Abajo)
        self.settings_panel = ctk.CTkFrame(self, corner_radius=15)
        self.settings_panel.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="nsew")

        self.settings_panel.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(self.settings_panel, text="Tamaño de Paso (mm):", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, padx=20, pady=20)
        self.step_toggle = ctk.CTkSegmentedButton(self.settings_panel, values=["0.1", "1", "10", "50"])
        self.step_toggle.grid(row=0, column=1, padx=20, pady=20, sticky="w")
        self.step_toggle.set("10")
        
        # Botón general de Home all
        self.btn_home_all = ctk.CTkButton(self.settings_panel, text="🏠 HOME ALL", fg_color="#8E44AD", hover_color="#732D91", font=ctk.CTkFont(weight="bold"))
        self.btn_home_all.grid(row=0, column=2, padx=20, pady=20, sticky="e")
