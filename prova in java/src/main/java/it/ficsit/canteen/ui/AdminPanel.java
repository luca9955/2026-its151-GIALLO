package it.ficsit.canteen.ui;

import it.ficsit.canteen.model.DashboardStats;
import it.ficsit.canteen.model.MenuItem;
import it.ficsit.canteen.model.Order;
import it.ficsit.canteen.model.Reservation;
import it.ficsit.canteen.model.Review;
import it.ficsit.canteen.storage.StorageService;

import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.GridLayout;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class AdminPanel extends JPanel {
    private final StorageService storage;
    private final NumberFormat currency = NumberFormat.getCurrencyInstance(Locale.ITALY);
    private JPanel dashboard;
    private DefaultTableModel menuModel;
    private DefaultTableModel reservationsModel;
    private DefaultTableModel ordersModel;
    private DefaultTableModel reviewsModel;

    public AdminPanel(StorageService storage) {
        this.storage = storage;
        setLayout(new BorderLayout(12, 12));
        setBackground(FicsitTheme.COAL);
        add(FicsitTheme.title("AREA ADMIN - TERMINALE FICSIT"), BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Dashboard", dashboardTab());
        tabs.addTab("Gestione Menu", menuTab());
        tabs.addTab("Prenotazioni", reservationsTab());
        tabs.addTab("Ordinazioni", ordersTab());
        tabs.addTab("Recensioni", reviewsTab());
        add(tabs, BorderLayout.CENTER);

        storage.addListener(this::refresh);
        refresh();
    }

    private JPanel dashboardTab() {
        dashboard = FicsitTheme.panel();
        dashboard.setLayout(new GridLayout(2, 2, 12, 12));
        return dashboard;
    }

    private JPanel menuTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout(10, 10));
        menuModel = new DefaultTableModel(new String[]{"ID", "Nome", "Categoria", "Descrizione", "Prezzo", "Disponibile"}, 0);
        JTable table = new JTable(menuModel);
        panel.add(new JScrollPane(table), BorderLayout.CENTER);

        JPanel actions = FicsitTheme.panel();
        actions.setLayout(new GridLayout(2, 1, 8, 8));
        JPanel form = FicsitTheme.panel();
        form.setLayout(new GridLayout(1, 6, 6, 6));
        JTextField name = new JTextField();
        JTextField category = new JTextField();
        JTextField description = new JTextField();
        JTextField price = new JTextField();
        JComboBox<String> available = new JComboBox<>(new String[]{"true", "false"});
        JButton add = FicsitTheme.button("Aggiungi");
        add.addActionListener(event -> {
            List<MenuItem> menu = new ArrayList<>(storage.getMenu());
            menu.add(new MenuItem(storage.createId("menu"), name.getText(), category.getText(), description.getText(), Double.parseDouble(price.getText()), Boolean.parseBoolean((String) available.getSelectedItem())));
            storage.saveMenu(menu);
        });
        form.add(name); form.add(category); form.add(description); form.add(price); form.add(available); form.add(add);

        JPanel rowActions = FicsitTheme.panel();
        JButton save = FicsitTheme.button("Salva modifiche tabella");
        JButton delete = FicsitTheme.button("Elimina riga selezionata");
        save.addActionListener(event -> saveMenuTable());
        delete.addActionListener(event -> {
            int row = table.getSelectedRow();
            if (row >= 0) {
                String id = (String) menuModel.getValueAt(row, 0);
                storage.saveMenu(storage.getMenu().stream().filter(item -> !item.getId().equals(id)).toList());
            }
        });
        rowActions.add(save);
        rowActions.add(delete);
        actions.add(form);
        actions.add(rowActions);
        panel.add(actions, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel reservationsTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout());
        reservationsModel = new DefaultTableModel(new String[]{"ID", "Cliente", "Email", "Persone", "Data", "Ora", "Tavolo", "Stato"}, 0);
        JTable table = new JTable(reservationsModel);
        panel.add(new JScrollPane(table), BorderLayout.CENTER);
        JButton save = FicsitTheme.button("Salva stati prenotazioni");
        save.addActionListener(event -> saveReservationsTable());
        panel.add(save, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel ordersTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout());
        ordersModel = new DefaultTableModel(new String[]{"ID", "Cliente", "Tavolo", "Articoli", "Totale", "Stato"}, 0);
        JTable table = new JTable(ordersModel);
        panel.add(new JScrollPane(table), BorderLayout.CENTER);
        JButton save = FicsitTheme.button("Salva stati ordini");
        save.addActionListener(event -> saveOrdersTable());
        panel.add(save, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel reviewsTab() {
        JPanel panel = FicsitTheme.panel();
        panel.setLayout(new BorderLayout());
        reviewsModel = new DefaultTableModel(new String[]{"ID", "Nome", "Stelle", "Commento"}, 0);
        JTable table = new JTable(reviewsModel);
        panel.add(new JScrollPane(table), BorderLayout.CENTER);
        JButton delete = FicsitTheme.button("Elimina recensione selezionata");
        delete.addActionListener(event -> {
            int row = table.getSelectedRow();
            if (row >= 0) {
                String id = (String) reviewsModel.getValueAt(row, 0);
                storage.saveReviews(storage.getReviews().stream().filter(review -> !review.getId().equals(id)).toList());
            }
        });
        panel.add(delete, BorderLayout.SOUTH);
        return panel;
    }

    public void refresh() {
        refreshDashboard();
        refreshMenu();
        refreshReservations();
        refreshOrders();
        refreshReviews();
    }

    private void refreshDashboard() {
        if (dashboard == null) {
            return;
        }
        DashboardStats stats = storage.getDashboardStats();
        dashboard.removeAll();
        dashboard.add(statCard("Prenotazioni oggi", String.valueOf(stats.todayReservations())));
        dashboard.add(statCard("Ordini attivi", String.valueOf(stats.activeOrders())));
        dashboard.add(statCard("Recensioni", String.valueOf(stats.reviewCount())));
        dashboard.add(statCard("Incasso giornaliero", currency.format(stats.dailyRevenue())));
        dashboard.revalidate();
        dashboard.repaint();
    }

    private JPanel statCard(String label, String value) {
        JPanel card = FicsitTheme.panel();
        card.setLayout(new GridLayout(2, 1));
        FicsitTheme.border(card);
        card.add(new JLabel(label));
        JLabel number = FicsitTheme.title(value);
        card.add(number);
        return card;
    }

    private void refreshMenu() {
        if (menuModel == null) {
            return;
        }
        menuModel.setRowCount(0);
        for (MenuItem item : storage.getMenu()) {
            menuModel.addRow(new Object[]{item.getId(), item.getName(), item.getCategory(), item.getDescription(), item.getPrice(), item.isAvailable()});
        }
    }

    private void refreshReservations() {
        if (reservationsModel == null) {
            return;
        }
        reservationsModel.setRowCount(0);
        for (Reservation reservation : storage.getReservations()) {
            reservationsModel.addRow(new Object[]{reservation.getId(), reservation.getCustomerName(), reservation.getEmail(), reservation.getPeople(), reservation.getDate(), reservation.getTime(), "T" + reservation.getTableId(), reservation.getStatus()});
        }
    }

    private void refreshOrders() {
        if (ordersModel == null) {
            return;
        }
        ordersModel.setRowCount(0);
        for (Order order : storage.getOrders()) {
            String lines = order.getLines().stream().map(line -> line.getQuantity() + " x " + line.getItemName()).reduce("", (left, right) -> left.isBlank() ? right : left + ", " + right);
            ordersModel.addRow(new Object[]{order.getId(), order.getCustomer(), order.getTableCode(), lines, order.getTotal(), order.getStatus()});
        }
    }

    private void refreshReviews() {
        if (reviewsModel == null) {
            return;
        }
        reviewsModel.setRowCount(0);
        for (Review review : storage.getReviews()) {
            reviewsModel.addRow(new Object[]{review.getId(), review.getName(), review.getRating(), review.getComment()});
        }
    }

    private void saveMenuTable() {
        List<MenuItem> menu = new ArrayList<>();
        for (int row = 0; row < menuModel.getRowCount(); row++) {
            menu.add(new MenuItem(
                    String.valueOf(menuModel.getValueAt(row, 0)),
                    String.valueOf(menuModel.getValueAt(row, 1)),
                    String.valueOf(menuModel.getValueAt(row, 2)),
                    String.valueOf(menuModel.getValueAt(row, 3)),
                    Double.parseDouble(String.valueOf(menuModel.getValueAt(row, 4))),
                    Boolean.parseBoolean(String.valueOf(menuModel.getValueAt(row, 5)))
            ));
        }
        storage.saveMenu(menu);
        JOptionPane.showMessageDialog(this, "Menu aggiornato.");
    }

    private void saveReservationsTable() {
        List<Reservation> reservations = new ArrayList<>(storage.getReservations());
        for (int row = 0; row < reservationsModel.getRowCount(); row++) {
            String id = String.valueOf(reservationsModel.getValueAt(row, 0));
            String status = String.valueOf(reservationsModel.getValueAt(row, 7));
            reservations.stream().filter(item -> item.getId().equals(id)).findFirst().ifPresent(item -> item.setStatus(status));
        }
        storage.saveReservations(reservations);
        JOptionPane.showMessageDialog(this, "Prenotazioni aggiornate.");
    }

    private void saveOrdersTable() {
        List<Order> orders = new ArrayList<>(storage.getOrders());
        for (int row = 0; row < ordersModel.getRowCount(); row++) {
            String id = String.valueOf(ordersModel.getValueAt(row, 0));
            String status = String.valueOf(ordersModel.getValueAt(row, 5));
            orders.stream().filter(item -> item.getId().equals(id)).findFirst().ifPresent(item -> item.setStatus(status));
        }
        storage.saveOrders(orders);
        JOptionPane.showMessageDialog(this, "Ordini aggiornati.");
    }
}
