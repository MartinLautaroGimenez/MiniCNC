import customtkinter as ctk
from .views.connection_view import ConnectionView
from .views.jog_view import JogView
from .views.job_view import JobView

class CNCApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Configuración principal de la ventana
        self.title("Mini CNC Control - Estilo Bambu Studio")
        self.geometry("900x600")
        self.minsize(800, 500)

        # Configurar la cuadrícula principal 1x2 (1 fila, 2 columnas)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1) # El área del contenido se expande
        
        # --- SIDEBAR (Barra de navegación izquierda) ---
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1) # Espacio vacío empuja cosas hacia abajo

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Mini CNC", font=ctk.CTkFont(size=24, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 30))

        # Botones de las pestañas
        self.btn_device = ctk.CTkButton(self.sidebar_frame, text="🔌 Conexión", command=lambda: self.select_frame("Device"))
        self.btn_device.grid(row=1, column=0, padx=20, pady=10)

        self.btn_prepare = ctk.CTkButton(self.sidebar_frame, text="🎮 Control Manual", command=lambda: self.select_frame("Prepare"))
        self.btn_prepare.grid(row=2, column=0, padx=20, pady=10)

        self.btn_preview = ctk.CTkButton(self.sidebar_frame, text="⚙️ G-Code", command=lambda: self.select_frame("Preview"))
        self.btn_preview.grid(row=3, column=0, padx=20, pady=10)

        # Selector de Tema
        self.appearance_mode_label = ctk.CTkLabel(self.sidebar_frame, text="Tema (Visual):", anchor="w")
        self.appearance_mode_label.grid(row=6, column=0, padx=20, pady=(10, 0))
        self.appearance_mode_optionemenu = ctk.CTkOptionMenu(self.sidebar_frame, values=["Light", "Dark", "System"],
                                                                       command=self.change_appearance_mode_event)
        self.appearance_mode_optionemenu.grid(row=7, column=0, padx=20, pady=(10, 20))
        self.appearance_mode_optionemenu.set("Dark")

        # --- ÁREA CENTRAL (Vistas / Content Frames) ---
        self.frames = {
            "Device": ConnectionView(self),
            "Prepare": JogView(self),
            "Preview": JobView(self)
        }
        
        # Seleccionar Pestaña por Defecto
        self.select_frame("Device")

    def select_frame(self, name):
        # Ocultar todos los frames
        for frame in self.frames.values():
            frame.grid_forget()
        
        # Resaltar el botón activo (Opcional: cambiar de color)
        self.btn_device.configure(fg_color=("gray75", "gray25") if name == "Device" else "transparent")
        self.btn_prepare.configure(fg_color=("gray75", "gray25") if name == "Prepare" else "transparent")
        self.btn_preview.configure(fg_color=("gray75", "gray25") if name == "Preview" else "transparent")

        # Mostrar el frame correspondiente
        selected_frame = self.frames[name]
        selected_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)

    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)
