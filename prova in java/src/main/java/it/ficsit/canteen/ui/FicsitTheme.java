package it.ficsit.canteen.ui;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.UIManager;
import java.awt.Color;
import java.awt.Font;

public final class FicsitTheme {
    public static final Color ORANGE = new Color(255, 106, 0);
    public static final Color COAL = new Color(17, 17, 17);
    public static final Color STEEL = new Color(34, 34, 34);
    public static final Color LIGHT = new Color(204, 204, 204);
    public static final Color GREEN = new Color(25, 212, 107);
    public static final Color RED = new Color(255, 51, 78);
    public static final Color BLUE = new Color(47, 125, 255);
    public static final Font TITLE_FONT = new Font("Arial Black", Font.BOLD, 22);
    public static final Font UI_FONT = new Font("Dialog", Font.BOLD, 13);

    private FicsitTheme() {
    }

    public static void install() {
        UIManager.put("Panel.background", COAL);
        UIManager.put("TabbedPane.background", COAL);
        UIManager.put("TabbedPane.foreground", LIGHT);
        UIManager.put("Table.background", STEEL);
        UIManager.put("Table.foreground", LIGHT);
        UIManager.put("Table.gridColor", ORANGE.darker());
        UIManager.put("TableHeader.background", COAL);
        UIManager.put("TableHeader.foreground", ORANGE);
        UIManager.put("Label.foreground", LIGHT);
        UIManager.put("Button.font", UI_FONT);
        UIManager.put("Label.font", UI_FONT);
        UIManager.put("TextField.font", UI_FONT);
        UIManager.put("TextArea.font", UI_FONT);
        UIManager.put("ComboBox.font", UI_FONT);
    }

    public static JPanel panel() {
        JPanel panel = new JPanel();
        panel.setBackground(COAL);
        return panel;
    }

    public static JLabel title(String text) {
        JLabel label = new JLabel(text);
        label.setForeground(ORANGE);
        label.setFont(TITLE_FONT);
        return label;
    }

    public static JButton button(String text) {
        JButton button = new JButton(text);
        button.setBackground(STEEL);
        button.setForeground(LIGHT);
        button.setFocusPainted(false);
        button.setBorder(BorderFactory.createLineBorder(ORANGE));
        return button;
    }

    public static void border(JComponent component) {
        component.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(ORANGE.darker()),
                BorderFactory.createEmptyBorder(12, 12, 12, 12)
        ));
    }
}
