package it.ficsit.canteen;

import it.ficsit.canteen.storage.StorageService;
import it.ficsit.canteen.ui.FicsitTheme;
import it.ficsit.canteen.ui.MainFrame;

import javax.swing.SwingUtilities;

public class App {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            FicsitTheme.install();
            StorageService storage = new StorageService();
            MainFrame frame = new MainFrame(storage);
            frame.setVisible(true);
        });
    }
}
