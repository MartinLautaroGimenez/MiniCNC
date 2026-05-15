import customtkinter as ctk
from gui.app import CNCApp

def main():
    # Establecer la apariencia por defecto de la librería (Moderno/Oscuro)
    ctk.set_appearance_mode("Dark")  # Modes: "System" (standard), "Dark", "Light"
    ctk.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"

    # Iniciar la aplicación
    app = CNCApp()
    app.mainloop()

if __name__ == "__main__":
    main()
