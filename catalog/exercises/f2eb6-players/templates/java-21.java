import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Coords {
    int x, y;
}

class Player {
    String name;
    Coords position;
    int score;
}

class Game {
    int width;
    int height;
    Player player1;
    Player player2;
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
      
      
      	// escriu aqui el codi
      
      
      	game.width = scanner.nextInt();
        game.height = scanner.nextInt();

        game.player1.name = scanner.next();
        game.player1.score = scanner.nextInt();
        game.player1.position.x = scanner.nextInt();
        game.player1.position.y = scanner.nextInt();

        game.player2.name = scanner.next();
        game.player2.score = scanner.nextInt();
        game.player2.position.x = scanner.nextInt();
        game.player2.position.y = scanner.nextInt();


        System.out.println("P1:" + game.player1.name + " #" + game.player1.score + " {"+game.player1.position.x+", "+game.player1.position.y+"}");
        System.out.println("P2:" + game.player2.name + " #" + game.player2.score + " {"+game.player2.position.x+", "+game.player2.position.y+"}");

    }
}