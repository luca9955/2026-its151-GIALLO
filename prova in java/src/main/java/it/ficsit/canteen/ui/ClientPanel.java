package it.ficsit.canteen.ui;

import it.ficsit.canteen.model.MenuItem;
import it.ficsit.canteen.model.Order;
import it.ficsit.canteen.model.OrderLine;
import it.ficsit.canteen.model.Reservation;
import it.ficsit.canteen.model.Review;
import it.ficsit.canteen.model.TableSeat;
import it.ficsit.canteen.storage.StorageService;

import javax.swing.BorderFactory;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SpinnerNumberModel;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.GridLayout;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ClientPanel extends JPanel {
    private final StorageService storage;
    private final NumberFormat currency = NumberFormat.getCurrencyInstance(Locale.ITALY);
    private JPanel menuList;
    private JPanel tableMap;
    private JPanel orderList;
    private int selectedTable;
    private final Map<String, JSpinner> orderSpinners = new LinkedHashMap<>();

    public ClientPanel(StorageService storage) {
        this.storage = storage;
        setLayout(new BorderLayout(12, 12));
        setBackground(FicsitTheme.COAL);
        add(FicsitTheme.title("AREA CLIENTE - FICSIT CANTEEN"), BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Menu", menuTab());
        tabs.addTab("Prenotazione", reservationTab());
        tabs.addTab("Ordinazione", orderTab());
        tabs.addTab("Recensioni", reviewTab());
        tabs.addTab("Contatti", contactsTab());
        add(tabs, BorderLayout.CENTER);

        storage.addListener(this::refresh);
        refresh();
    }

    private JPanel menuTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout());
        menuList = FicsitTheme.panel();
        menuList.setLayout(new BoxLayout(menuList, BoxLayout.Y_AXIS));
        panel.add(new JScrollPane(menuList), BorderLayout.CENTER);
        return panel;
    }

    private JPanel reservationTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new GridLayout(1, 2, 14, 14));
        tableMap = FicsitTheme.panel();
        tableMap.setLayout(new GridLayout(4, 4, 8, 8));
        FicsitTheme.border(tableMap);

        JPanel form = FicsitTheme.panel();
        form.setLayout(new GridLayout(10, 2, 8, 8));
        FicsitTheme.border(form);
        JTextField firstName = new JTextField();
        JTextField lastName = new JTextField();
        JTextField phone = new JTextField();
        JTextField email = new JTextField();
        JSpinner people = new JSpinner(new SpinnerNumberModel(2, 1, 12, 1));
        JTextField date = new JTextField("2026-06-08");
        JTextField time = new JTextField("20:30");
        JLabel selected = new JLabel("Nessun tavolo");

        form.add(new JLabel("Nome")); form.add(firstName);
        form.add(new JLabel("Cognome")); form.add(lastName);
        form.add(new JLabel("Telefono")); form.add(phone);
        form.add(new JLabel("Email")); form.add(email);
        form.add(new JLabel("Persone")); form.add(people);
        form.add(new JLabel("Data yyyy-mm-dd")); form.add(date);
        form.add(new JLabel("Ora")); form.add(time);
        form.add(new JLabel("Tavolo")); form.add(selected);

        JButton submit = FicsitTheme.button("Conferma prenotazione");
        submit.addActionListener(event -> {
            if (selectedTable == 0) {
                JOptionPane.showMessageDialog(this, "Seleziona un tavolo libero.");
                return;
            }
            List<Reservation> reservations = new ArrayList<>(storage.getReservations());
            reservations.add(new Reservation(storage.createId("res"), firstName.getText(), lastName.getText(), phone.getText(), email.getText(), (int) people.getValue(), date.getText(), time.getText(), selectedTable));
            storage.saveReservations(reservations);
            selectedTable = 0;
            selected.setText("Nessun tavolo");
            JOptionPane.showMessageDialog(this, "Prenotazione inviata al terminale admin.");
        });
        form.add(new JLabel(""));
        form.add(submit);
        panel.add(tableMap);
        panel.add(form);

        tableMap.putClientProperty("selectedLabel", selected);
        return panel;
    }

    private JPanel orderTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout(12, 12));
        orderList = FicsitTheme.panel();
        orderList.setLayout(new BoxLayout(orderList, BoxLayout.Y_AXIS));
        panel.add(new JScrollPane(orderList), BorderLayout.CENTER);

        JPanel form = FicsitTheme.panel();
        form.setLayout(new GridLayout(4, 2, 8, 8));
        FicsitTheme.border(form);
        JTextField customer = new JTextField();
        JTextField tableCode = new JTextField("T1");
        JButton submit = FicsitTheme.button("Invia ordine");
        submit.addActionListener(event -> {
            List<OrderLine> lines = new ArrayList<>();
            for (MenuItem item : storage.getMenu()) {
                JSpinner spinner = orderSpinners.get(item.getId());
                int quantity = spinner == null ? 0 : (int) spinner.getValue();
                if (quantity > 0) {
                    lines.add(new OrderLine(item.getName(), quantity, item.getPrice()));
                }
            }
            if (lines.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Aggiungi almeno un piatto.");
                return;
            }
            List<Order> orders = new ArrayList<>(storage.getOrders());
            orders.add(new Order(storage.createId("ord"), customer.getText(), tableCode.getText(), lines));
            storage.saveOrders(orders);
            JOptionPane.showMessageDialog(this, "Ordine trasmesso alla cucina FICSIT.");
        });
        form.add(new JLabel("Cliente")); form.add(customer);
        form.add(new JLabel("Tavolo")); form.add(tableCode);
        form.add(new JLabel("")); form.add(submit);
        panel.add(form, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel reviewTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new GridLayout(1, 2, 12, 12));
        JPanel form = FicsitTheme.panel();
        form.setLayout(new GridLayout(5, 2, 8, 8));
        FicsitTheme.border(form);
        JTextField name = new JTextField();
        JComboBox<Integer> rating = new JComboBox<>(new Integer[]{1, 2, 3, 4, 5});
        JTextArea comment = new JTextArea(5, 20);
        JButton submit = FicsitTheme.button("Invia recensione");
        submit.addActionListener(event -> {
            List<Review> reviews = new ArrayList<>(storage.getReviews());
            reviews.add(new Review(storage.createId("rev"), name.getText(), (int) rating.getSelectedItem(), comment.getText()));
            storage.saveReviews(reviews);
            JOptionPane.showMessageDialog(this, "Recensione sincronizzata.");
        });
        form.add(new JLabel("Nome")); form.add(name);
        form.add(new JLabel("Stelle")); form.add(rating);
        form.add(new JLabel("Commento")); form.add(new JScrollPane(comment));
        form.add(new JLabel("")); form.add(submit);

        JTextArea preview = new JTextArea("Anteprima recensione FICSIT");
        preview.setEditable(false);
        preview.setBackground(FicsitTheme.STEEL);
        preview.setForeground(FicsitTheme.LIGHT);
        panel.add(form);
        panel.add(new JScrollPane(preview));
        return panel;
    }

    private JPanel contactsTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout());
        JTextArea text = new JTextArea("FICSIT Canteen\nAvamposto 04 - Settore Hub Centrale\nTelefono: +39 000 000 4242\nEmail: terminal@ficsit-canteen.local\nTurni: 12:00-15:00 / 19:00-23:30");
        text.setEditable(false);
        text.setBackground(FicsitTheme.STEEL);
        text.setForeground(FicsitTheme.LIGHT);
        FicsitTheme.border(text);
        panel.add(text);
        return panel;
    }

    public void refresh() {
        if (menuList != null) {
            menuList.removeAll();
            for (MenuItem item : storage.getMenu()) {
                if (!item.isAvailable()) {
                    continue;
                }
                JLabel label = new JLabel(item.getCategory() + " | " + item.getName() + " | " + currency.format(item.getPrice()) + " - " + item.getDescription());
                label.setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
                menuList.add(label);
            }
            menuList.revalidate();
            menuList.repaint();
        }

        if (tableMap != null) {
            JLabel selectedLabel = (JLabel) tableMap.getClientProperty("selectedLabel");
            tableMap.removeAll();
            for (TableSeat table : storage.getTables()) {
                JButton button = FicsitTheme.button("T" + table.getId());
                button.setToolTipText("Tavolo " + table.getId() + ": " + table.getStatus());
                button.setBackground(colorForTable(table));
                button.setEnabled("Libero".equals(table.getStatus()));
                button.addActionListener(event -> {
                    selectedTable = table.getId();
                    selectedLabel.setText("T" + selectedTable);
                    refresh();
                });
                if (selectedTable == table.getId()) {
                    button.setBackground(FicsitTheme.BLUE);
                }
                tableMap.add(button);
            }
            tableMap.revalidate();
            tableMap.repaint();
        }

        if (orderList != null) {
            rebuildOrderList(orderList);
            orderList.revalidate();
            orderList.repaint();
        }
    }

    public void rebuildOrderList(JPanel orderList) {
        orderList.removeAll();
        orderSpinners.clear();
        for (MenuItem item : storage.getMenu()) {
            if (!item.isAvailable()) {
                continue;
            }
            JPanel row = FicsitTheme.panel();
            row.setLayout(new GridLayout(1, 3, 8, 8));
            JSpinner spinner = new JSpinner(new SpinnerNumberModel(0, 0, 20, 1));
            orderSpinners.put(item.getId(), spinner);
            row.add(new JLabel(item.getName()));
            row.add(new JLabel(currency.format(item.getPrice())));
            row.add(spinner);
            orderList.add(row);
        }
    }

    private Color colorForTable(TableSeat table) {
        if ("Occupato".equals(table.getStatus())) {
            return FicsitTheme.RED;
        }
        if ("Prenotato".equals(table.getStatus())) {
            return FicsitTheme.ORANGE;
        }
        return FicsitTheme.GREEN;
    }
}
