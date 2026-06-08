package it.ficsit.canteen;

import it.ficsit.canteen.model.DashboardStats;
import it.ficsit.canteen.model.MenuItem;
import it.ficsit.canteen.model.Order;
import it.ficsit.canteen.model.OrderLine;
import it.ficsit.canteen.model.Reservation;
import it.ficsit.canteen.model.Review;
import it.ficsit.canteen.model.TableSeat;
import it.ficsit.canteen.storage.StorageService;

import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.control.Spinner;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class App extends Application {
    private final StorageService storage = new StorageService();
    private final NumberFormat currency = NumberFormat.getCurrencyInstance(Locale.ITALY);
    private final StackPane content = new StackPane();
    private BorderPane root;
    private int selectedTable;
    private String currentView = "role";

    @Override
    public void start(Stage stage) {
        root = new BorderPane();
        root.getStyleClass().add("app-root");
        root.setCenter(content);

        Scene scene = new Scene(root, 1280, 780);
        scene.getStylesheets().add(getClass().getResource("/styles/ficsit.css").toExternalForm());
        stage.setTitle("FICSIT Canteen - JavaFX");
        stage.setMinWidth(1080);
        stage.setMinHeight(720);
        stage.setScene(scene);
        showRoleSelection();
        storage.addListener(this::renderCurrentView);
        stage.show();
    }

    private void renderCurrentView() {
        switch (currentView) {
            case "client" -> showClient();
            case "role" -> showRoleSelection();
            case "menu" -> showMenuAdmin();
            case "reservations" -> showReservationsAdmin();
            case "orders" -> showOrdersAdmin();
            case "reviews" -> showReviewsAdmin();
            default -> showDashboard();
        }
    }

    private void showRoleSelection() {
        currentView = "role";
        root.setLeft(null);

        VBox rolePage = new VBox(24);
        rolePage.getStyleClass().addAll("page", "role-page");
        rolePage.setAlignment(Pos.CENTER);

        Label title = new Label("FICSIT Canteen");
        title.getStyleClass().add("hero-title");
        Label subtitle = new Label("Seleziona il terminale operativo");
        subtitle.getStyleClass().add("page-title");

        HBox choices = new HBox(18);
        choices.setAlignment(Pos.CENTER);
        Button client = roleButton("Sono cliente", "Menu, prenotazioni, ordini, recensioni", () -> {
            root.setLeft(sidebar("client"));
            showClient();
        });
        Button admin = roleButton("Sono amministratore", "Dashboard e gestione operativa", () -> {
            root.setLeft(sidebar("admin"));
            showDashboard();
        });
        choices.getChildren().addAll(client, admin);
        rolePage.getChildren().addAll(title, subtitle, choices);
        content.getChildren().setAll(rolePage);
    }

    private Button roleButton(String title, String description, Runnable action) {
        Button button = new Button(title + "\n" + description);
        button.getStyleClass().add("role-card");
        button.setOnAction(event -> action.run());
        return button;
    }

    private VBox sidebar(String role) {
        VBox side = new VBox(12);
        side.getStyleClass().add("sidebar");
        Label brand = new Label("FICSIT\n" + role.toUpperCase(Locale.ITALY));
        brand.getStyleClass().add("brand");
        side.getChildren().add(brand);
        if ("client".equals(role)) {
            side.getChildren().addAll(
                    navButton("Area Cliente", this::showClient),
                    navButton("Cambia ruolo", this::showRoleSelection)
            );
        } else {
            side.getChildren().addAll(
                    navButton("Dashboard", this::showDashboard),
                    navButton("Gestione Menu", this::showMenuAdmin),
                    navButton("Prenotazioni", this::showReservationsAdmin),
                    navButton("Ordinazioni", this::showOrdersAdmin),
                    navButton("Recensioni", this::showReviewsAdmin),
                    navButton("Cambia ruolo", this::showRoleSelection)
            );
        }
        return side;
    }

    private Button navButton(String text, Runnable action) {
        Button button = new Button(text);
        button.getStyleClass().add("nav-button");
        button.setMaxWidth(Double.MAX_VALUE);
        button.setOnAction(event -> action.run());
        return button;
    }

    private void setContent(String title, javafx.scene.Node node) {
        VBox page = new VBox(18);
        page.getStyleClass().add("page");
        Label heading = new Label(title);
        heading.getStyleClass().add("page-title");
        page.getChildren().addAll(heading, node);
        content.getChildren().setAll(page);
    }

    private void showDashboard() {
        currentView = "dashboard";
        DashboardStats stats = storage.getDashboardStats();
        GridPane grid = grid(2);
        grid.add(statCard("Prenotazioni oggi", String.valueOf(stats.todayReservations())), 0, 0);
        grid.add(statCard("Ordini attivi", String.valueOf(stats.activeOrders())), 1, 0);
        grid.add(statCard("Recensioni", String.valueOf(stats.reviewCount())), 0, 1);
        grid.add(statCard("Incasso giornaliero", currency.format(stats.dailyRevenue())), 1, 1);
        setContent("Terminale Admin FICSIT", grid);
    }

    private VBox statCard(String label, String value) {
        VBox card = card();
        Label name = new Label(label);
        name.getStyleClass().add("eyebrow");
        Label number = new Label(value);
        number.getStyleClass().add("stat-number");
        card.getChildren().addAll(name, number, new Label("Dati letti dal repository condiviso"));
        return card;
    }

    private void showClient() {
        currentView = "client";
        TabPane tabs = new TabPane();
        tabs.getTabs().add(tab("Home", homeView()));
        tabs.getTabs().add(tab("Menu", menuClientView()));
        tabs.getTabs().add(tab("Prenota", reservationClientView()));
        tabs.getTabs().add(tab("Ordina", orderClientView()));
        tabs.getTabs().add(tab("Recensioni", reviewClientView()));
        tabs.getTabs().add(tab("Contatti", contactsView()));
        setContent("Area Cliente", tabs);
    }

    private Tab tab(String title, javafx.scene.Node content) {
        Tab tab = new Tab(title, content);
        tab.setClosable(false);
        return tab;
    }

    private VBox homeView() {
        VBox hero = card();
        Label title = new Label("FICSIT Canteen");
        title.getStyleClass().add("hero-title");
        hero.getChildren().addAll(
                new Label("Terminale mensa operativo"),
                title,
                new Label("Prenotazioni, ordini, menu e recensioni sincronizzati nello stesso layer dati Java.")
        );
        return hero;
    }

    private ScrollPane menuClientView() {
        VBox list = new VBox(12);
        for (MenuItem item : storage.getMenu()) {
            if (item.isAvailable()) {
                list.getChildren().add(menuCard(item, false));
            }
        }
        return scroll(list);
    }

    private VBox reservationClientView() {
        HBox layout = new HBox(18);
        GridPane map = grid(4);
        refreshTableMap(map, null);

        VBox form = card();
        TextField firstName = input("Nome");
        TextField lastName = input("Cognome");
        TextField phone = input("Telefono");
        TextField email = input("Email");
        TextField people = input("Persone");
        TextField date = input("Data yyyy-mm-dd");
        date.setText("2026-06-08");
        TextField time = input("Ora");
        time.setText("20:30");
        Label selected = new Label("Tavolo selezionato: nessuno");
        refreshTableMap(map, selected);
        Button submit = primary("Conferma prenotazione");
        submit.setOnAction(event -> {
            if (selectedTable == 0) {
                selected.setText("Seleziona prima un tavolo libero");
                return;
            }
            List<Reservation> reservations = new ArrayList<>(storage.getReservations());
            reservations.add(new Reservation(storage.createId("res"), firstName.getText(), lastName.getText(), phone.getText(), email.getText(), parseInt(people.getText(), 1), date.getText(), time.getText(), selectedTable));
            storage.saveReservations(reservations);
            selectedTable = 0;
            showClient();
        });
        form.getChildren().addAll(firstName, lastName, phone, email, people, date, time, selected, submit);
        HBox.setHgrow(map, Priority.ALWAYS);
        HBox.setHgrow(form, Priority.ALWAYS);
        layout.getChildren().addAll(map, form);
        return wrap(layout);
    }

    private void refreshTableMap(GridPane map, Label selected) {
        map.getChildren().clear();
        int index = 0;
        for (TableSeat table : storage.getTables()) {
            Button seat = new Button("T" + table.getId());
            seat.getStyleClass().addAll("table-seat", tableStatusClass(table));
            if (selectedTable == table.getId()) {
                seat.getStyleClass().add("selected");
            }
            seat.setDisable(!"Libero".equals(table.getStatus()));
            seat.setOnAction(event -> {
                selectedTable = table.getId();
                if (selected != null) {
                    selected.setText("Tavolo selezionato: T" + selectedTable);
                }
                refreshTableMap(map, selected);
            });
            map.add(seat, index % 4, index / 4);
            index++;
        }
    }

    private ScrollPane orderClientView() {
        VBox page = new VBox(14);
        Map<MenuItem, Spinner<Integer>> spinners = new LinkedHashMap<>();
        for (MenuItem item : storage.getMenu()) {
            if (!item.isAvailable()) {
                continue;
            }
            VBox row = menuCard(item, true);
            Spinner<Integer> spinner = new Spinner<>(0, 20, 0);
            spinner.getStyleClass().add("quantity");
            row.getChildren().add(spinner);
            spinners.put(item, spinner);
            page.getChildren().add(row);
        }
        VBox form = card();
        TextField customer = input("Nome cliente");
        TextField table = input("Codice tavolo");
        table.setText("T1");
        Button submit = primary("Invia ordine");
        submit.setOnAction(event -> {
            List<OrderLine> lines = new ArrayList<>();
            spinners.forEach((item, spinner) -> {
                int quantity = spinner.getValue();
                if (quantity > 0) {
                    lines.add(new OrderLine(item.getName(), quantity, item.getPrice()));
                }
            });
            if (!lines.isEmpty()) {
                List<Order> orders = new ArrayList<>(storage.getOrders());
                orders.add(new Order(storage.createId("ord"), customer.getText(), table.getText(), lines));
                storage.saveOrders(orders);
                showClient();
            }
        });
        form.getChildren().addAll(customer, table, submit);
        page.getChildren().add(form);
        return scroll(page);
    }

    private VBox reviewClientView() {
        VBox form = card();
        TextField name = input("Nome");
        ComboBox<Integer> rating = new ComboBox<>(FXCollections.observableArrayList(1, 2, 3, 4, 5));
        rating.getSelectionModel().select(Integer.valueOf(5));
        TextArea comment = new TextArea();
        comment.setPromptText("Commento");
        Button submit = primary("Invia recensione");
        submit.setOnAction(event -> {
            List<Review> reviews = new ArrayList<>(storage.getReviews());
            reviews.add(new Review(storage.createId("rev"), name.getText(), rating.getValue(), comment.getText()));
            storage.saveReviews(reviews);
            showClient();
        });
        form.getChildren().addAll(name, rating, comment, submit);
        return form;
    }

    private VBox contactsView() {
        VBox card = card();
        card.getChildren().addAll(
                new Label("Avamposto 04 - Settore Hub Centrale"),
                new Label("+39 000 000 4242"),
                new Label("terminal@ficsit-canteen.local"),
                new Label("Turni: 12:00-15:00 / 19:00-23:30")
        );
        return card;
    }

    private void showMenuAdmin() {
        currentView = "menu";
        VBox page = new VBox(14);
        for (MenuItem item : storage.getMenu()) {
            HBox row = new HBox(10);
            row.getStyleClass().add("data-row");
            TextField name = input("Nome");
            name.setText(item.getName());
            TextField price = input("Prezzo");
            price.setText(String.valueOf(item.getPrice()));
            ComboBox<Boolean> available = new ComboBox<>(FXCollections.observableArrayList(true, false));
            available.setValue(item.isAvailable());
            Button save = primary("Salva");
            save.setOnAction(event -> {
                item.setName(name.getText());
                item.setPrice(parseDouble(price.getText(), item.getPrice()));
                item.setAvailable(available.getValue());
                storage.saveMenu(storage.getMenu());
                showMenuAdmin();
            });
            Button delete = danger("Elimina");
            delete.setOnAction(event -> {
                storage.saveMenu(storage.getMenu().stream().filter(menuItem -> !menuItem.getId().equals(item.getId())).toList());
                showMenuAdmin();
            });
            row.getChildren().addAll(name, price, available, save, delete);
            page.getChildren().add(row);
        }
        VBox add = card();
        TextField name = input("Nuovo piatto");
        TextField category = input("Categoria");
        TextField description = input("Descrizione");
        TextField price = input("Prezzo");
        Button create = primary("Aggiungi al menu");
        create.setOnAction(event -> {
            List<MenuItem> menu = new ArrayList<>(storage.getMenu());
            menu.add(new MenuItem(storage.createId("menu"), name.getText(), category.getText(), description.getText(), parseDouble(price.getText(), 0), true));
            storage.saveMenu(menu);
            showMenuAdmin();
        });
        add.getChildren().addAll(name, category, description, price, create);
        page.getChildren().add(add);
        setContent("Gestione Menu", scroll(page));
    }

    private void showReservationsAdmin() {
        currentView = "reservations";
        VBox page = new VBox(12);
        for (Reservation reservation : storage.getReservations()) {
            HBox row = new HBox(10);
            row.getStyleClass().add("data-row");
            Label info = new Label(reservation.getCustomerName() + " | T" + reservation.getTableId() + " | " + reservation.getDate() + " " + reservation.getTime());
            ComboBox<String> status = new ComboBox<>(FXCollections.observableArrayList("In attesa", "Approvata", "Rifiutata"));
            status.setValue(reservation.getStatus());
            status.setOnAction(event -> {
                reservation.setStatus(status.getValue());
                storage.saveReservations(storage.getReservations());
            });
            row.getChildren().addAll(info, status);
            HBox.setHgrow(info, Priority.ALWAYS);
            page.getChildren().add(row);
        }
        setContent("Prenotazioni Admin", scroll(page));
    }

    private void showOrdersAdmin() {
        currentView = "orders";
        VBox page = new VBox(12);
        for (Order order : storage.getOrders()) {
            HBox row = new HBox(10);
            row.getStyleClass().add("data-row");
            Label info = new Label(order.getCustomer() + " | " + order.getTableCode() + " | " + currency.format(order.getTotal()));
            ComboBox<String> status = new ComboBox<>(FXCollections.observableArrayList("Ricevuto", "Accettato", "In preparazione", "Pronto", "Consegnato"));
            status.setValue(order.getStatus());
            status.setOnAction(event -> {
                order.setStatus(status.getValue());
                storage.saveOrders(storage.getOrders());
            });
            row.getChildren().addAll(info, status);
            HBox.setHgrow(info, Priority.ALWAYS);
            page.getChildren().add(row);
        }
        setContent("Ordinazioni Admin", scroll(page));
    }

    private void showReviewsAdmin() {
        currentView = "reviews";
        VBox page = new VBox(12);
        for (Review review : storage.getReviews()) {
            HBox row = new HBox(10);
            row.getStyleClass().add("data-row");
            Label info = new Label(review.getName() + " | " + "★".repeat(review.getRating()) + " | " + review.getComment());
            Button delete = danger("Elimina");
            delete.setOnAction(event -> {
                storage.saveReviews(storage.getReviews().stream().filter(item -> !item.getId().equals(review.getId())).toList());
                showReviewsAdmin();
            });
            row.getChildren().addAll(info, delete);
            HBox.setHgrow(info, Priority.ALWAYS);
            page.getChildren().add(row);
        }
        setContent("Recensioni Admin", scroll(page));
    }

    private VBox menuCard(MenuItem item, boolean compact) {
        VBox card = card();
        Label category = new Label(item.getCategory());
        category.getStyleClass().add("eyebrow");
        Label name = new Label(item.getName());
        name.getStyleClass().add(compact ? "card-title-small" : "card-title");
        card.getChildren().addAll(category, name, new Label(item.getDescription()), new Label(currency.format(item.getPrice())));
        return card;
    }

    private VBox card() {
        VBox card = new VBox(10);
        card.getStyleClass().add("panel-card");
        return card;
    }

    private VBox wrap(javafx.scene.Node node) {
        VBox wrapper = new VBox(node);
        wrapper.setFillWidth(true);
        return wrapper;
    }

    private GridPane grid(int columns) {
        GridPane grid = new GridPane();
        grid.setHgap(14);
        grid.setVgap(14);
        grid.setPadding(new Insets(4));
        for (int i = 0; i < columns; i++) {
            javafx.scene.layout.ColumnConstraints column = new javafx.scene.layout.ColumnConstraints();
            column.setPercentWidth(100.0 / columns);
            grid.getColumnConstraints().add(column);
        }
        return grid;
    }

    private ScrollPane scroll(javafx.scene.Node node) {
        ScrollPane scrollPane = new ScrollPane(node);
        scrollPane.setFitToWidth(true);
        scrollPane.getStyleClass().add("scroll");
        return scrollPane;
    }

    private TextField input(String prompt) {
        TextField field = new TextField();
        field.setPromptText(prompt);
        return field;
    }

    private Button primary(String text) {
        Button button = new Button(text);
        button.getStyleClass().add("primary-button");
        return button;
    }

    private Button danger(String text) {
        Button button = new Button(text);
        button.getStyleClass().add("danger-button");
        return button;
    }

    private String tableStatusClass(TableSeat table) {
        return switch (table.getStatus()) {
            case "Occupato" -> "occupied";
            case "Prenotato" -> "reserved";
            default -> "free";
        };
    }

    private int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private double parseDouble(String value, double fallback) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    public static void run(String[] args) {
        launch(args);
    }
}
