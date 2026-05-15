import customtkinter as ctk

class ConnectionView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, corner_radius=10, fg_color="transparent")
        
        # Titulo
        self.title = ctk.CTkLabel(self, text="Dispositivo y Conexión Serial", font=ctk.CTkFont(size=20, weight="bold"))
        self.title.grid(row=0, column=0, padx=20, pady=(0, 20), sticky="w")

        # Panel de conexión (tarjeta central)
        self.panel = ctk.CTkFrame(self, corner_radius=15)
        self.panel.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1) # The console will expand

        # Controles dentro del Panel
        ctk.CTkLabel(self.panel, text="Puerto COM:").grid(row=0, column=0, padx=20, pady=20, sticky="e")
        self.combo_port = ctk.CTkOptionMenu(self.panel, values=["COM1", "COM2", "COM3", "Auto-Detect"])
        self.combo_port.grid(row=0, column=1, padx=20, pady=20, sticky="w")

        ctk.CTkLabel(self.panel, text="Baudrate:").grid(row=1, column=0, padx=20, pady=10, sticky="e")
        self.combo_baud = ctk.CTkOptionMenu(self.panel, values=["9600", "115200", "250000"])
        self.combo_baud.grid(row=1, column=1, padx=20, pady=10, sticky="w")
        self.combo_baud.set("115200")

        # Botón de Conectar
        self.btn_connect = ctk.CTkButton(self.panel, text="Conectar", fg_color="#2ECC71", hover_color="#27AE60", text_color="white", font=ctk.CTkFont(weight="bold"))
        self.btn_connect.grid(row=2, column=0, columnspan=2, padx=20, pady=(20, 30))
        
        # Consola mock
        self.console_label = ctk.CTkLabel(self, text="Terminal Serial:", font=ctk.CTkFont(weight="bold"))
        self.console_label.grid(row=2, column=0, padx=20, pady=(20, 5), sticky="w")
        
        self.console_textbox = ctk.CTkTextbox(self, height=150)
        self.console_textbox.grid(row=3, column=0, padx=20, pady=5, sticky="nsew")

        self.console_textbox.insert("0.0", "Iniciando sistema...\nListo para conectar a la Mini CNC.\n")
        self.console_textbox.configure(state="disabled") # Solo lectura
