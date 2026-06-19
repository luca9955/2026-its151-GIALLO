package it.ficsit.canteen.ui;

import it.ficsit.canteen.storage.StorageService;

import javax.swing.JFrame;
import javax.swing.JTabbedPane;
import java.awt.Dimension;

public class MainFrame extends JFrame {
    public MainFrame(StorageService storage) {
        super("FICSIT Canteen - Java Desktop");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 720));
        setLocationRelativeTo(null);

        JTabbedPane rootTabs = new JTabbedPane();
        rootTabs.addTab("Area Cliente", new ClientPanel(storage));
        rootTabs.addTab("Area Admin", new AdminPanel(storage));
        setContentPane(rootTabs);
    }
}
