import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


// escriu el codi aqui

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Game game = new Game(new Player(0), new Player(0));

        int numRondas = scanner.nextInt();

        for (int i = 0; i < numRondas; i++) {
            String ronda = scanner.next();
            if(ronda.equals("@%") || ronda.equals("#@") || ronda.equals("%#")){
                game.player1.points++;
            } else if(ronda.equals("%@") || ronda.equals("@#") || ronda.equals("#%")){
                game.player2.points++;
            }
        }

        if(game.player1.points > game.player2.points){
            System.out.println("PLAYER 1 WINS");
        } else if(game.player2.points > game.player1.points){
            System.out.println("PLAYER 2 WINS");
        } else {
            System.out.println("TIE");
        }
    }
}