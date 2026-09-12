import java.util.Scanner;


class Song {
    String name;
    String artist;
    float rating;
    boolean favorite;
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // escriu aqui el codi

        System.out.print(song.favorite ? "<3 " : "   ");
        System.out.println(song.artist + " - " + song.name);
        for (int i = 0; i < (int) song.rating; i++) {
            System.out.print("*");
        }
    }
}